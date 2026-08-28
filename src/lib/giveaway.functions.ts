import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const drawGiveawayWinner = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    month_key: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const month = data.month_key ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Only one winner per month — return the existing one if any
    const { data: existing } = await supabaseAdmin
      .from("giveaway_winners" as never)
      .select("*")
      .eq("month_key", month)
      .maybeSingle();
    if (existing) return { ok: true as const, winner: existing, already: true };

    const { data: entries, error } = await supabaseAdmin
      .from("giveaway_entries" as never)
      .select("id, order_id, phone_number, customer_name")
      .eq("month_key", month);
    if (error) throw new Error(error.message);
    if (!entries || entries.length === 0) {
      return { ok: false as const, message: "No entries for this month yet." };
    }

    const pick = entries[Math.floor(Math.random() * entries.length)] as {
      id: string;
      order_id: string;
      phone_number: string | null;
      customer_name: string;
    };

    const { data: winner, error: winErr } = await supabaseAdmin
      .from("giveaway_winners" as never)
      .insert({
        month_key: month,
        entry_id: pick.id,
        order_id: pick.order_id,
        phone_number: pick.phone_number,
        customer_name: pick.customer_name,
        drawn_manually: true,
      } as never)
      .select("*")
      .single();
    if (winErr) throw new Error(winErr.message);

    return { ok: true as const, winner, already: false };
  });

export const getGiveawayOverview = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    const [prizeResult, entriesResult, winnersResult] = await Promise.all([
      supabaseAdmin.from("giveaway_prizes" as never).select("id,title,description,prize_value,image_url,end_date,is_active").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("giveaway_entries" as never).select("phone_number", { count: "exact" }).eq("month_key", currentMonth),
      supabaseAdmin.from("giveaway_winners" as never).select("id,month_key,customer_name,phone_number,drawn_at").order("drawn_at", { ascending: false }).limit(24),
    ]);
    if (prizeResult.error || entriesResult.error || winnersResult.error) {
      console.error("Giveaway overview failed:", prizeResult.error ?? entriesResult.error ?? winnersResult.error);
      throw new Error("Could not load giveaway details");
    }

    const phones = (entriesResult.data ?? []) as unknown as Array<{ phone_number: string | null }>;
    const participants = new Set(phones.map((row) => row.phone_number?.replace(/\D/g, "")).filter(Boolean)).size;
    const winners = ((winnersResult.data ?? []) as unknown as Array<{
      id: string; month_key: string; customer_name: string; phone_number: string | null; drawn_at: string;
    }>).map((winner) => ({
      ...winner,
      phone_number: winner.phone_number ? winner.phone_number.replace(/\D/g, "").slice(-4) : null,
    }));

    return {
      currentMonth,
      prize: (prizeResult.data ?? null) as unknown,
      totalTickets: entriesResult.count ?? phones.length,
      participants,
      winners,
    };
  });

export const getGiveawayTickets = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    phone_number: z.string().trim().min(5).max(32).regex(/^[+\d\s().-]+$/, "Invalid phone number"),
  }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = data.phone_number.replace(/\D/g, "");
    const { data: entries, error } = await supabaseAdmin
      .from("giveaway_entries" as never)
      .select("id,month_key,phone_number")
      .limit(1000);
    if (error) throw new Error("Could not load giveaway tickets");
    const matches = ((entries ?? []) as unknown as Array<{ id: string; month_key: string; phone_number: string | null }>)
      .filter((entry) => entry.phone_number?.replace(/\D/g, "") === digits)
      .map(({ id, month_key }) => ({ id, month_key }));
    return { tickets: matches };
  });

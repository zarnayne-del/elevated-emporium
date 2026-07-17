import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function currentMonthKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const DrawSchema = z.object({
  month_key: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const drawGiveawayWinner = createServerFn({ method: "POST" })
  .inputValidator((input) => DrawSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const month = data.month_key ?? currentMonthKey();

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

// Automated monthly draw endpoint payload
export { currentMonthKey };

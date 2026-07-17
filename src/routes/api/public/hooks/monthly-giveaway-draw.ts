import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/monthly-giveaway-draw")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Only run on the last day of the month (UTC). Cron schedules daily.
        const now = new Date();
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const isLastDay = tomorrow.getUTCDate() === 1;
        if (!isLastDay) {
          return Response.json({ ok: true, skipped: true, reason: "not last day of month" });
        }

        const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

        const { data: existing } = await supabaseAdmin
          .from("giveaway_winners" as never)
          .select("id")
          .eq("month_key", month)
          .maybeSingle();
        if (existing) return Response.json({ ok: true, already: true, month });

        const { data: entries, error } = await supabaseAdmin
          .from("giveaway_entries" as never)
          .select("id, order_id, phone_number, customer_name")
          .eq("month_key", month);
        if (error) return new Response(error.message, { status: 500 });
        if (!entries || entries.length === 0) {
          return Response.json({ ok: true, month, winner: null, message: "no entries" });
        }

        const pick = entries[Math.floor(Math.random() * entries.length)] as {
          id: string; order_id: string; phone_number: string | null; customer_name: string;
        };

        const { data: winner, error: wErr } = await supabaseAdmin
          .from("giveaway_winners" as never)
          .insert({
            month_key: month,
            entry_id: pick.id,
            order_id: pick.order_id,
            phone_number: pick.phone_number,
            customer_name: pick.customer_name,
            drawn_manually: false,
          } as never)
          .select("*")
          .single();
        if (wErr) return new Response(wErr.message, { status: 500 });

        // Best-effort Telegram notify
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          if (token && chatId) {
            const text = `🎉 Monthly Giveaway Winner (${month})\nName: ${pick.customer_name}\nPhone: ${pick.phone_number ?? "—"}`;
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text }),
            });
          }
        } catch (e) {
          console.error("giveaway notify failed", e);
        }

        return Response.json({ ok: true, month, winner });
      },
    },
  },
});

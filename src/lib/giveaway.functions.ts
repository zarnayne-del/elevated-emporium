import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/security-policy";

export const drawGiveawayWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ month_key: z.string().regex(/^\d{4}-\d{2}$/).optional() }).parse(input ?? {}))
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return { ok: false as const, message: "Draws are paused pending merchandise and giveaway compliance.", already: false };
  });

export const getGiveawayOverview = createServerFn({ method: "GET" })
  .handler(async () => {
    // Do not advertise prizes or order-linked entries for the controlled catalog.
    return { paused: true, prize: null, winners: [], totalTickets: null, participants: null };
  });

export const getGiveawayTickets = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone_number: z.string().max(32) }).parse(input))
  .handler(async () => ({ tickets: [] }));

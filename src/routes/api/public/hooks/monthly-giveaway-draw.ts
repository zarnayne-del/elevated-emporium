import { createFileRoute } from "@tanstack/react-router";

// No public draw, winner data, database mutation, or Telegram send.
export const Route = createFileRoute("/api/public/hooks/monthly-giveaway-draw")({
  server: { handlers: { POST: async () => new Response("Unavailable", { status: 403 }) } },
});

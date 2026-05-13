import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { notifyOrder } from "@/lib/telegram.server";

const Body = z.object({ order_id: z.string().uuid() });

export const Route = createFileRoute("/api/public/notify-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            return new Response("Bad request", { status: 400 });
          }
          const result = await notifyOrder(parsed.data.order_id);
          return Response.json(result);
        } catch (e) {
          console.error("notify-order route error:", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Fail closed while the catalog is entirely Flower and purchase compliance is pending.
// No persistence, uploads, notifications, or existence-dependent responses occur here.
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(async () => ({
    ok: false as const,
    reason: "purchasing_paused" as const,
    message: "Purchasing is paused pending merchandise compliance and secure order processing.",
  }));

export const uploadPaymentScreenshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(async (): Promise<{ path: string }> => {
    throw new Error("Payment uploads are paused while purchasing is unavailable.");
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone_number: z.string().max(32) }).parse(input))
  .handler(async () => ({
    orders: [],
    message:
      "For private order assistance, contact customer service. Public phone lookups are unavailable.",
  }));

export const getOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async () => ({ phone_number: null }));

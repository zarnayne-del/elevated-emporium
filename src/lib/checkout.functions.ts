import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CheckoutSchema = z.object({
  email: z.string().trim().email().max(255),
  shipping_name: z.string().trim().min(1).max(120),
  shipping_address: z.string().trim().min(1).max(255),
  shipping_city: z.string().trim().min(1).max(100),
  shipping_zip: z.string().trim().min(1).max(20),
  shipping_country: z.string().trim().min(2).max(60),
  payment_screenshot_url: z.string().trim().url().max(500),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(50),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => CheckoutSchema.parse(input))
  .handler(async ({ data }) => {
    // Re-price server-side (don't trust client prices)
    const ids = data.items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, slug, name, price_cents, in_stock")
      .in("id", ids);

    if (prodErr) throw new Error("Failed to load products");
    if (!products || products.length !== ids.length) {
      throw new Error("One or more items are unavailable");
    }

    const priced = data.items.map((it) => {
      const p = products.find((p) => p.id === it.product_id)!;
      if (!p.in_stock) throw new Error(`${p.name} is out of stock`);
      return {
        product_id: p.id,
        product_slug: p.slug,
        product_name: p.name,
        unit_price_cents: p.price_cents,
        quantity: it.quantity,
      };
    });

    const subtotal_cents = priced.reduce(
      (s, i) => s + i.unit_price_cents * i.quantity,
      0
    );
    const shipping_cents = subtotal_cents >= 15000 ? 0 : 800;
    const total_cents = subtotal_cents + shipping_cents;

    // Insert order — every NOT NULL column has a value or DB default
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        email: data.email,
        shipping_name: data.shipping_name,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city,
        shipping_zip: data.shipping_zip,
        shipping_country: data.shipping_country,
        subtotal_cents,
        shipping_cents,
        total_cents,
        payment_screenshot_url: data.payment_screenshot_url,
      })
      .select("id, order_number, total_cents")
      .single();

    if (orderErr || !order) {
      console.error("Order insert failed:", orderErr);
      throw new Error("Could not create order");
    }

    const itemsPayload = priced.map((p) => ({ ...p, order_id: order.id }));
    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsPayload);

    if (itemsErr) {
      console.error("Order items insert failed:", itemsErr);
      // Roll back the order
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Could not create order items");
    }

    // Telegram notification (non-blocking failure)
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        const lines = priced.map(
          (p) =>
            `• ${p.quantity}× ${p.product_name} — $${(
              (p.unit_price_cents * p.quantity) /
              100
            ).toFixed(2)}`
        );
        const message =
          `🟢 NEW ORDER ${order.order_number}\n` +
          `${data.shipping_name} <${data.email}>\n` +
          `${data.shipping_address}, ${data.shipping_city} ${data.shipping_zip} ${data.shipping_country}\n\n` +
          lines.join("\n") +
          `\n\nSubtotal: $${(subtotal_cents / 100).toFixed(2)}` +
          `\nShipping: $${(shipping_cents / 100).toFixed(2)}` +
          `\nTotal: $${(total_cents / 100).toFixed(2)}`;

        const res = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "HTML",
            }),
          }
        );
        if (res.ok) {
          await supabaseAdmin
            .from("orders")
            .update({ notified_at: new Date().toISOString(), status: "confirmed" })
            .eq("id", order.id);
        } else {
          const body = await res.text();
          console.error("Telegram send failed:", res.status, body);
        }
      } else {
        console.warn("Telegram env vars missing — skipping notification");
      }
    } catch (e) {
      console.error("Telegram notification error:", e);
    }

    return {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
    };
  });

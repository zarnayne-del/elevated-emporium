import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyOrder } from "@/lib/telegram.server";

const CheckoutSchema = z.object({
  email: z.string().trim().email().max(255),
  shipping_name: z.string().trim().min(1).max(120),
  shipping_address: z.string().trim().min(1).max(255),
  shipping_city: z.string().trim().min(1).max(100),
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
    const ids = data.items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, slug, name, price_cents, in_stock")
      .in("id", ids);

    if (prodErr) throw new Error("Failed to load products");

    const priced = data.items
      .map((it) => {
        const p = products?.find((p) => p.id === it.product_id);
        if (!p) return null;
        if (!p.in_stock) throw new Error(`${p.name} is out of stock`);
        return {
          product_id: p.id,
          product_slug: p.slug,
          product_name: p.name,
          unit_price_cents: p.price_cents,
          quantity: it.quantity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (priced.length === 0) {
      throw new Error(
        "Your cart items are no longer available. Please clear your cart and add fresh items from the shop."
      );
    }

    const subtotal_cents = priced.reduce(
      (s, i) => s + i.unit_price_cents * i.quantity,
      0
    );
    const shipping_cents = subtotal_cents >= 15000 ? 0 : 800;
    const total_cents = subtotal_cents + shipping_cents;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        email: data.email,
        shipping_name: data.shipping_name,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city,
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
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Could not create order items");
    }

    // Fire Telegram notification (failure is logged but does not break checkout)
    try {
      await notifyOrder(order.id);
    } catch (e) {
      console.error("notifyOrder failed:", e);
    }

    return {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
    };
  });

const TrackSchema = z.object({
  reference: z.string().trim().min(3).max(64),
});

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => TrackSchema.parse(input))
  .handler(async ({ data }) => {
    const ref = data.reference.trim();
    // Match by order_number (e.g. KC-12345) or by short id prefix
    const upper = ref.toUpperCase();
    const isUuidish = /^[0-9a-fA-F-]{8,}$/.test(ref);

    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, shipping_name, shipping_city, total_cents, created_at, notified_at"
      )
      .limit(1);

    if (upper.startsWith("KC-")) {
      query = query.eq("order_number", upper);
    } else if (isUuidish) {
      // Try id first
      const { data: byId } = await supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, status, shipping_name, shipping_city, total_cents, created_at, notified_at"
        )
        .ilike("id", `${ref.toLowerCase()}%`)
        .limit(1);
      if (byId && byId.length > 0) return { order: byId[0] };
      query = query.eq("order_number", `KC-${ref}`);
    } else {
      query = query.eq("order_number", `KC-${ref}`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("trackOrder error:", error);
      throw new Error("Lookup failed");
    }
    return { order: rows && rows[0] ? rows[0] : null };
  });

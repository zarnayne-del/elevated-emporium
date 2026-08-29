import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeShippingMmk, computeDeliveryMmk, mmkToCents } from "@/lib/products";

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      phone_number: z.string().trim().min(5).max(32).regex(/^[+\d\s().-]+$/, "Invalid phone number"),
      shipping_name: z.string().trim().min(1).max(120),
      shipping_address: z.string().trim().min(1).max(255),
      shipping_city: z.string().trim().min(1).max(100),
      payment_screenshot_url: z.string().trim().url().max(500),
      items: z.array(z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      })).min(1).max(50),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, slug, name, price_cents, in_stock")
      .in("id", ids);

    if (prodErr) throw new Error("Failed to load products");

    const unavailable = data.items.filter((it) => {
      const p = products?.find((p) => p.id === it.product_id);
      return !p || !p.in_stock;
    });

    if (unavailable.length > 0) {
      return {
        ok: false as const,
        reason: "stale_cart" as const,
        message:
          "Your cart items are no longer available. Please clear your cart and add fresh items from the shop.",
      };
    }

    const priced = data.items.map((it) => {
      const p = products?.find((product) => product.id === it.product_id);
      if (!p) throw new Error("Product unavailable");
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
    const shipping_mmk = computeShippingMmk(data.shipping_address, data.shipping_city);
    const delivery_mmk = computeDeliveryMmk(data.shipping_address, data.shipping_city);
    const shipping_cents = mmkToCents(shipping_mmk);
    const delivery_cents = mmkToCents(delivery_mmk);
    const total_cents = subtotal_cents + shipping_cents + delivery_cents;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        phone_number: data.phone_number,
        shipping_name: data.shipping_name,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city,
        subtotal_cents,
        shipping_cents,
        delivery_cents,
        total_cents,
        payment_screenshot_url: data.payment_screenshot_url,
      } as never)
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
      const { notifyOrder } = await import("@/lib/telegram.server");
      await notifyOrder(order.id);
    } catch (e) {
      console.error("notifyOrder failed:", e);
    }

    return {
      ok: true as const,
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
    };
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      phone_number: z.string().trim().min(5).max(32).regex(/^[+\d\s().-]+$/, "Invalid phone number"),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.phone_number.trim();
    const digits = raw.replace(/[^\d]/g, "");

    // Fetch candidates and match by normalized digits to be tolerant
    // of formatting differences (spaces, dashes, parentheses, +).
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, shipping_name, shipping_city, shipping_address, total_cents, created_at, notified_at, phone_number"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("trackOrder error:", error);
      throw new Error("Lookup failed");
    }

    const matches = (rows ?? []).filter(
      (r) => r.phone_number && r.phone_number.replace(/[^\d]/g, "") === digits
    );

    return { orders: matches };
  });

export const uploadPaymentScreenshot = createServerFn({ method: "POST" })
  .inputValidator((input) => {
    if (!(input instanceof FormData)) throw new Error("Invalid upload");
    return input;
  })
  .handler(async ({ data }) => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Select a payment screenshot");
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      throw new Error("Payment screenshot must be smaller than 5MB");
    }
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensions[file.type];
    if (!extension) throw new Error("Use a JPG, PNG, or WebP image");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage
      .from("payment-screenshots")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("Payment screenshot upload failed:", error);
      throw new Error("Could not upload payment screenshot");
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("payment-screenshots")
      .getPublicUrl(path);
    return { url: publicData.publicUrl };
  });

export const getOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("phone_number")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Could not load order confirmation");
    return { phone_number: order?.phone_number ?? null };
  });

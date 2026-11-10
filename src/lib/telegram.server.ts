import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramOrderMessage } from "./telegram-delivery.server";
import { isLawfulMerchandise } from "./security-policy";

export async function notifyOrder(orderId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("Telegram env vars missing — skipping notification");
    return { sent: false, reason: "missing-env" };
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, email, phone_number, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, subtotal_cents, shipping_cents, delivery_cents, total_cents, status, notified_at",
    )
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error("notifyOrder: order lookup failed");
    return { sent: false, reason: "order-not-found" };
  }
  if (order.notified_at) return { sent: false, reason: "already-notified" };

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("order_items")
    .select("product_id, product_name, quantity, unit_price_cents")
    .eq("order_id", orderId);

  if (itemsErr) {
    console.error("notifyOrder: item lookup failed");
    return { sent: false, reason: "items-lookup-failed" };
  }
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id,category,name,slug,description")
    .in(
      "id",
      (items ?? []).map((item) => item.product_id),
    );
  if (
    productsError ||
    !items?.length ||
    items.some(
      (item) =>
        !products?.some(
          (product) => product.id === item.product_id && isLawfulMerchandise(product),
        ),
    )
  ) {
    return { sent: false, reason: "controlled-or-unverified-merchandise" };
  }

  const USD_TO_MMK = 3500;
  const mmk = (cents: number) =>
    `${Math.round((cents / 100) * USD_TO_MMK).toLocaleString("en-US")} Ks`;

  const lines = (items ?? []).map(
    (p) => `• ${p.quantity}× ${p.product_name} — ${mmk(p.unit_price_cents * p.quantity)}`,
  );

  const addr = [
    order.shipping_address,
    order.shipping_city,
    order.shipping_zip,
    order.shipping_country,
  ]
    .filter(Boolean)
    .join(", ");

  // Plain text — avoids HTML parse errors from emails like <name@x.com>
  const message =
    `🟢 NEW ORDER ${order.order_number}\n` +
    `${order.shipping_name} (${order.phone_number ?? order.email ?? "—"})\n` +
    `${addr}\n\n` +
    (lines.length ? lines.join("\n") + "\n\n" : "") +
    `Subtotal: ${mmk(order.subtotal_cents)}\n` +
    `Packing Fees: ${mmk(order.shipping_cents)}\n` +
    `Delivery Fees: ${mmk(order.delivery_cents)}\n` +
    `Total: ${mmk(order.total_cents)}` +
    `\nReceipt: available to authorized staff in the admin panel.`;

  try {
    const delivery = await sendTelegramOrderMessage(token, chatId, message);
    if (!delivery.sent) return delivery;
    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        notified_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (updateErr) {
      console.error("notifyOrder: Telegram accepted message but delivery record update failed");
    }
    return { sent: true };
  } catch {
    console.error("Telegram notification failed during order processing");
    return { sent: false, reason: "exception" };
  }
}

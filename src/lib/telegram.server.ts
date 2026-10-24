import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramOrderMessage } from "./telegram-delivery.server";

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
      "id, order_number, email, phone_number, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, subtotal_cents, shipping_cents, total_cents, status, payment_screenshot_url"
    )
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error("notifyOrder: order lookup failed");
    return { sent: false, reason: "order-not-found" };
  }

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("order_items")
    .select("product_name, quantity, unit_price_cents")
    .eq("order_id", orderId);

  if (itemsErr) {
    console.error("notifyOrder: item lookup failed");
    return { sent: false, reason: "items-lookup-failed" };
  }

  const USD_TO_MMK = 3500;
  const mmk = (cents: number) =>
    `${Math.round((cents / 100) * USD_TO_MMK).toLocaleString("en-US")} Ks`;

  const lines = (items ?? []).map(
    (p) => `• ${p.quantity}× ${p.product_name} — ${mmk(p.unit_price_cents * p.quantity)}`
  );

  const addr = [
    order.shipping_address,
    order.shipping_city,
    order.shipping_zip,
    order.shipping_country,
  ]
    .filter(Boolean)
    .join(", ");

  // Receipts live in a private bucket — share a short-lived signed link only.
  let receiptLink: string | null = null;
  const stored = order.payment_screenshot_url;
  if (stored) {
    const marker = "/payment-screenshots/";
    const idx = stored.indexOf(marker);
    const path = idx >= 0 ? stored.slice(idx + marker.length) : /^https?:\/\//i.test(stored) ? null : stored;
    if (path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("payment-screenshots")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      receiptLink = signed?.signedUrl ?? null;
    }
  }

  // Plain text — avoids HTML parse errors from emails like <name@x.com>
  const message =
    `🟢 NEW ORDER ${order.order_number}\n` +
    `${order.shipping_name} (${order.phone_number ?? order.email ?? "—"})\n` +
    `${addr}\n\n` +
    (lines.length ? lines.join("\n") + "\n\n" : "") +
    `Subtotal: ${mmk(order.subtotal_cents)}\n` +
    `Shipping: ${mmk(order.shipping_cents)}\n` +
    `Total: ${mmk(order.total_cents)}` +
    (receiptLink ? `\n\nReceipt (valid 7 days): ${receiptLink}` : "");

  try {
    const delivery = await sendTelegramOrderMessage(token, chatId, message);
    if (!delivery.sent) return delivery;
    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        notified_at: new Date().toISOString(),
        status: order.status === "pending" ? "confirmed" : order.status,
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

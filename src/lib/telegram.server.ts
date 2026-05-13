import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
    console.error("notifyOrder: order not found", orderErr);
    return { sent: false, reason: "order-not-found" };
  }

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_name, quantity, unit_price_cents")
    .eq("order_id", orderId);

  const lines = (items ?? []).map(
    (p) =>
      `• ${p.quantity}× ${p.product_name} — $${(
        (p.unit_price_cents * p.quantity) /
        100
      ).toFixed(2)}`
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
    `${order.shipping_name} (${order.email})\n` +
    `${addr}\n\n` +
    (lines.length ? lines.join("\n") + "\n\n" : "") +
    `Subtotal: $${(order.subtotal_cents / 100).toFixed(2)}\n` +
    `Shipping: $${(order.shipping_cents / 100).toFixed(2)}\n` +
    `Total: $${(order.total_cents / 100).toFixed(2)}` +
    (order.payment_screenshot_url
      ? `\n\nReceipt: ${order.payment_screenshot_url}`
      : "");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.error("Telegram send failed:", res.status, body);
      return { sent: false, reason: `telegram-${res.status}`, body };
    }
    await supabaseAdmin
      .from("orders")
      .update({
        notified_at: new Date().toISOString(),
        status: order.status === "pending" ? "confirmed" : order.status,
      })
      .eq("id", orderId);
    return { sent: true };
  } catch (e) {
    console.error("Telegram notification error:", e);
    return { sent: false, reason: "exception" };
  }
}

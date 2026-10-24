type DeliveryResult =
  | { sent: true }
  | { sent: false; reason: string; status?: number; errorCode?: number };

/** Never return Telegram response bodies: they may contain private identifiers. */
export async function sendTelegramOrderMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<DeliveryResult> {
  try {
    // Telegram limits text to 4096 characters. Leave room for a truncation marker.
    const characters = Array.from(text);
    const message = characters.length > 4000
      ? `${characters.slice(0, 4000).join("")}\n… (order details truncated)`
      : text;
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    const fields = payload && typeof payload === "object"
      ? payload as Record<string, unknown>
      : null;
    if (!response.ok || fields?.ok !== true) {
      return {
        sent: false,
        reason: "telegram-rejected",
        status: response.status,
        ...(typeof fields?.error_code === "number" ? { errorCode: fields.error_code } : {}),
      };
    }
    const result = fields.result;
    if (!result || typeof result !== "object" ||
        typeof (result as Record<string, unknown>).message_id !== "number") {
      return { sent: false, reason: "invalid-telegram-response", status: response.status };
    }
    return { sent: true };
  } catch {
    // Fetch exceptions can include the token-bearing URL. Never log the exception.
    return { sent: false, reason: "telegram-network-or-timeout" };
  }
}
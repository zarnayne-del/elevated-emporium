import { afterEach, expect, test } from "bun:test";
import { sendTelegramOrderMessage } from "./telegram-delivery.server";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("HTTP 200 with Telegram ok:false is not marked delivered", async () => {
  globalThis.fetch = (async () => Response.json({ ok: false, error_code: 400 })) as typeof fetch;
  expect(await sendTelegramOrderMessage("test-token", "test-destination", "Order"))
    .toEqual({ sent: false, reason: "telegram-rejected", status: 200, errorCode: 400 });
});

test("only Telegram acknowledgement with a message ID counts as delivered", async () => {
  globalThis.fetch = (async () => Response.json({ ok: true, result: { message_id: 123 } })) as typeof fetch;
  expect(await sendTelegramOrderMessage("test-token", "test-destination", "Order"))
    .toEqual({ sent: true });
});

test("large cart notifications remain under Telegram's 4096 character limit", async () => {
  let length = 0;
  globalThis.fetch = (async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    length = Array.from(payload.text).length;
    return Response.json({ ok: true, result: { message_id: 123 } });
  }) as typeof fetch;
  await sendTelegramOrderMessage("test-token", "test-destination", "x".repeat(8000));
  expect(length).toBeGreaterThan(4000);
  expect(length).toBeLessThanOrEqual(4096);
});

test("network exceptions do not expose token-bearing URLs", async () => {
  globalThis.fetch = (async () => { throw new Error("https://api.telegram.org/bottest-token/sendMessage"); }) as typeof fetch;
  expect(await sendTelegramOrderMessage("test-token", "test-destination", "Order"))
    .toEqual({ sent: false, reason: "telegram-network-or-timeout" });
});

test("malformed acknowledgements are not marked delivered", async () => {
  globalThis.fetch = (async () => Response.json({ ok: true })) as typeof fetch;
  expect((await sendTelegramOrderMessage("test-token", "test-destination", "Order")).sent).toBe(false);
});
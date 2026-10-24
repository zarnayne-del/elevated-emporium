import { afterEach, expect, test, spyOn } from "bun:test";
import { sendTelegramOrderMessage } from "./telegram-delivery.server";

let fetchSpy: ReturnType<typeof spyOn> | undefined;
afterEach(() => { fetchSpy?.mockRestore(); });

test("HTTP 200 with Telegram ok:false is not marked delivered", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ ok: false, error_code: 400 }));
  expect(await sendTelegramOrderMessage("test-token", "test-destination", "Order"))
    .toEqual({ sent: false, reason: "telegram-rejected", status: 200, errorCode: 400 });
});

test("only Telegram acknowledgement with a message ID counts as delivered", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ ok: true, result: { message_id: 123 } }));
  expect(await sendTelegramOrderMessage("test-token", "test-destination", "Order"))
    .toEqual({ sent: true });
});

test("large cart notifications remain under Telegram's 4096 character limit", async () => {
  let length = 0;
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    length = Array.from(payload.text).length;
    return Response.json({ ok: true, result: { message_id: 123 } });
  });
  await sendTelegramOrderMessage("test-token", "test-destination", "x".repeat(8000));
  expect(length).toBeGreaterThan(4000);
  expect(length).toBeLessThanOrEqual(4096);
});

test("network exceptions do not expose token-bearing URLs", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("https://api.telegram.org/bottest-token/sendMessage"); });
  expect(await sendTelegramOrderMessage("test-token", "test-destination", "Order"))
    .toEqual({ sent: false, reason: "telegram-network-or-timeout" });
});

test("malformed acknowledgements are not marked delivered", async () => {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ ok: true }));
  expect((await sendTelegramOrderMessage("test-token", "test-destination", "Order")).sent).toBe(false);
});
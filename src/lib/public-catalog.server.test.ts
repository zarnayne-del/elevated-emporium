import { afterEach, expect, test } from "bun:test";
import { publicCatalogClient } from "./public-catalog.server";

const originalFetch = globalThis.fetch;
const originalUrl = process.env["SUPABASE_URL"];
const originalKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env["SUPABASE_URL"];
  else process.env["SUPABASE_URL"] = originalUrl;
  if (originalKey === undefined) delete process.env["SUPABASE_PUBLISHABLE_KEY"];
  else process.env["SUPABASE_PUBLISHABLE_KEY"] = originalKey;
});

test("opaque public keys use apikey without an invalid bearer token", async () => {
  process.env["SUPABASE_URL"] = "https://catalog.example.invalid";
  process.env["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_mock";
  let observedHeaders = new Headers();
  let observedSignal: AbortSignal | null | undefined;
  globalThis.fetch = Object.assign(
    async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      observedHeaders = new Headers(init?.headers);
      observedSignal = init?.signal;
      return Response.json([]);
    },
    { preconnect: originalFetch.preconnect },
  );
  const { data, error } = await publicCatalogClient().from("products").select("id");
  expect(error).toBeNull();
  expect(data).toEqual([]);
  expect(observedHeaders.get("apikey")).toBe("sb_publishable_mock");
  expect(observedHeaders.has("authorization")).toBe(false);
  expect(observedSignal).toBeInstanceOf(AbortSignal);
});

test("missing public catalog configuration fails closed", () => {
  delete process.env["SUPABASE_URL"];
  delete process.env["SUPABASE_PUBLISHABLE_KEY"];
  expect(() => publicCatalogClient()).toThrow("Catalog unavailable");
});
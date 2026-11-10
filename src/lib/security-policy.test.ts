import { expect, test } from "bun:test";
import { assertAdmin, isLawfulMerchandise, receiptPath } from "./security-policy";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

test("Flower and cannabis-labelled apparel are never lawful storefront merchandise", () => {
  expect(isLawfulMerchandise({ category: "Flower", name: "Flower" })).toBe(false);
  expect(isLawfulMerchandise({ category: "Streetwear", description: "THC product" })).toBe(false);
  expect(isLawfulMerchandise({ category: "Streetwear", name: "Cotton tee" })).toBe(true);
});

test("receipt paths reject traversal and public query-string links", () => {
  expect(receiptPath("../receipt.png")).toBe(null);
  expect(receiptPath("2026-11-10/12345678-1234-1234-1234-123456789abc.png?token=example")).toBe(
    null,
  );
  expect(receiptPath("2026-11-10/12345678-1234-1234-1234-123456789abc.png")).toBe(
    "2026-11-10/12345678-1234-1234-1234-123456789abc.png",
  );
});

test("a signed-in account without an admin role is denied", async () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const supabase = { from: () => query } as unknown as SupabaseClient<Database>;
  await expect(assertAdmin({ supabase, userId: "test-user" })).rejects.toThrow(
    "Staff authorization required.",
  );
});

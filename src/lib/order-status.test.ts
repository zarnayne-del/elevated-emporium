import { expect, test } from "bun:test";
import { canTransitionOrderStatus, isOrderStatus } from "./order-status";

test("confirmed is a recognized existing order status", () => {
  expect(isOrderStatus("confirmed")).toBe(true);
  expect(canTransitionOrderStatus("pending", "confirmed")).toBe(true);
  expect(canTransitionOrderStatus("confirmed", "payment_verified")).toBe(true);
});

test("status changes cannot skip payment verification, go backward, or rewrite unknown statuses", () => {
  expect(canTransitionOrderStatus("confirmed", "shipped")).toBe(false);
  expect(canTransitionOrderStatus("delivered", "pending")).toBe(false);
  expect(canTransitionOrderStatus("unknown", "pending")).toBe(false);
  expect(canTransitionOrderStatus("payment_verified", "shipped")).toBe(true);
  expect(canTransitionOrderStatus("shipped", "delivered")).toBe(true);
});

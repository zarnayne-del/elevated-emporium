/** Existing records retain their status; lawful orders may only advance one stage. */
export const ORDER_STATUSES = ["pending", "confirmed", "payment_verified", "shipped", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(status: string): status is OrderStatus {
  return ORDER_STATUSES.some(value => value === status);
}

export function canTransitionOrderStatus(current: string, next: OrderStatus): boolean {
  if (!isOrderStatus(current)) return false;
  return current === next || ORDER_STATUSES.indexOf(next) === ORDER_STATUSES.indexOf(current) + 1;
}
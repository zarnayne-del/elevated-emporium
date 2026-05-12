import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  product_id: string;
  slug: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
};

const KEY = "kc-cart-v1";
const EVENT = "kc-cart-change";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addToCart(item: Omit<CartItem, "quantity">, qty = 1) {
  const items = read();
  const idx = items.findIndex((i) => i.product_id === item.product_id);
  if (idx >= 0) items[idx].quantity += qty;
  else items.push({ ...item, quantity: qty });
  write(items);
}

export function setQuantity(product_id: string, qty: number) {
  const items = read()
    .map((i) => (i.product_id === product_id ? { ...i, quantity: qty } : i))
    .filter((i) => i.quantity > 0);
  write(items);
}

export function removeFromCart(product_id: string) {
  write(read().filter((i) => i.product_id !== product_id));
}

export function clearCart() {
  write([]);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const refresh = useCallback(() => setItems(read()), []);
  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const subtotal = items.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, subtotal, count };
}

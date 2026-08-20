import { listProducts } from "@/lib/products.functions";
import type { Product } from "@/lib/products";

// Re-export for consumers that still import the column list from here.
export { PRODUCT_COLUMNS } from "@/lib/products.functions";

const DEFAULT_TIMEOUT_MS = 15_000;

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return (AbortSignal as unknown as { timeout: (n: number) => AbortSignal }).timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Cellular networks (carrier proxies, IPv6-only APNs, lossy links) can leave a
 * fetch hanging forever. All product reads now go through a same-origin server
 * function so the browser only talks to the app's domain; the server makes the
 * Supabase call over its reliable upstream connection.
 */
export async function fetchProducts(opts?: {
  slug?: string;
  limit?: number;
  timeoutMs?: number;
}): Promise<Product[]> {
  const signal = timeoutSignal(opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const products = await listProducts({ data: opts ?? {} });
    return products;
  } catch (err: any) {
    // If the server function itself aborted, surface as a mobile-friendly timeout.
    if (err?.message?.includes("abort") || err?.message?.includes("signal") || err?.name === "AbortError") {
      throw new Error(
        "The connection timed out. Check your mobile data signal and try again."
      );
    }
    throw new Error(err?.message || "Could not load inventory.");
  }
}

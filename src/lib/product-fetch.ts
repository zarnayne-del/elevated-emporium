import { listProducts } from "@/lib/products.functions";
import type { Product } from "@/lib/products";

// Re-export for consumers that still import the column list from here.
export { PRODUCT_COLUMNS } from "@/lib/products.functions";

const DEFAULT_TIMEOUT_MS = 15_000;

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
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const products = await Promise.race([
      listProducts({ data: { slug: opts?.slug, limit: opts?.limit } }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("The connection timed out. Please try again.")),
          opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      }),
    ]);
    return products;
  } catch (err: unknown) {
    // If the server function itself aborted, surface as a mobile-friendly timeout.
    if (err instanceof Error && (err.message.includes("abort") || err.message.includes("signal") || err.name === "AbortError")) {
      throw new Error(
        "The connection timed out. Check your mobile data signal and try again."
      );
    }
    throw new Error(err instanceof Error ? err.message : "Could not load inventory.");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

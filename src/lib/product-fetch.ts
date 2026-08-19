import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";

// Columns we actually render. Avoids shipping unused/heavy fields over slow
// cellular links.
export const PRODUCT_COLUMNS =
  "id,slug,name,category,subtitle,description,price_cents,color,in_stock,sort_order,image_url,image_path,image_urls";

const DEFAULT_TIMEOUT_MS = 15_000;

function timeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout isn't available in every mobile browser build.
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return (AbortSignal as unknown as { timeout: (n: number) => AbortSignal }).timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Cellular networks (carrier proxies, IPv6-only APNs, lossy links) can leave a
 * fetch hanging forever. supabase-js has no default timeout, so the query
 * promise never settles and the UI stays on "Loading inventory…".
 * Every product read goes through here: bounded timeout + retries.
 */
export async function fetchProducts(opts?: {
  slug?: string;
  limit?: number;
  timeoutMs?: number;
}): Promise<Product[]> {
  let q = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("sort_order", { ascending: true })
    .abortSignal(timeoutSignal(opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS));

  if (opts?.slug) q = q.eq("slug", opts.slug);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) {
    throw new Error(
      error.message?.includes("abort") || error.message?.includes("signal")
        ? "The connection timed out. Check your mobile data signal and try again."
        : error.message || "Could not load inventory.",
    );
  }
  return (data ?? []) as unknown as Product[];
}

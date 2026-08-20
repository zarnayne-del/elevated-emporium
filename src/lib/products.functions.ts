import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Product } from "@/lib/products";

export const PRODUCT_COLUMNS =
  "id,slug,name,category,subtitle,description,price_cents,color,in_stock,sort_order,image_url,image_path,image_urls";

const ListProductsSchema = z.object({
  slug: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * Proxied product read. The storefront calls this server function instead of
 * hitting Supabase directly from the browser. This routes all catalog traffic
 * through the application's own domain (which has reliable IPv6/IPv4 and CDN
 * connectivity), so mobile carriers that block or cannot resolve the Supabase
 * REST endpoint still load products normally.
 */
export const listProducts = createServerFn({ method: "POST" })
  .inputValidator((input) => ListProductsSchema.parse(input))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("sort_order", { ascending: true });

    if (data.slug) q = q.eq("slug", data.slug);
    if (data.limit) q = q.limit(data.limit);

    const { data: rows, error } = await q;

    if (error) {
      console.error("listProducts error:", error);
      throw new Error("Could not load inventory.");
    }

    return (rows ?? []) as unknown as Product[];
  });

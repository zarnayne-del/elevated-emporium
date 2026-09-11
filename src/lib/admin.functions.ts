import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedContext = {
  supabase: { from: (t: string) => any };
  userId: string;
};

/**
 * Verifies the caller holds the `admin` role (checked through the user's own
 * RLS-scoped client) and only then hands back the privileged service client.
 */
async function requireAdmin(context: AuthedContext) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !data) {
    throw new Response("Forbidden: admin access required", { status: 403 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Turns a stored receipt reference (path or legacy public URL) into a storage path. */
function receiptPath(stored: string | null): string | null {
  if (!stored) return null;
  const marker = "/payment-screenshots/";
  const idx = stored.indexOf(marker);
  if (idx >= 0) return stored.slice(idx + marker.length);
  if (/^https?:\/\//i.test(stored)) return null;
  return stored;
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context as unknown as AuthedContext).supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (context as unknown as AuthedContext).userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

/* ---------------------------------- orders --------------------------------- */

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { data, error } = await admin
      .from("orders")
      .select(
        "id, order_number, email, phone_number, shipping_name, shipping_city, shipping_country, total_cents, status, payment_screenshot_url, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Could not load orders");

    const orders = await Promise.all(
      (data ?? []).map(async (o) => {
        const path = receiptPath(o.payment_screenshot_url);
        let receipt_url: string | null = null;
        if (path) {
          const { data: signed } = await admin.storage
            .from("payment-screenshots")
            .createSignedUrl(path, 3600);
          receipt_url = signed?.signedUrl ?? null;
        }
        const { payment_screenshot_url: _drop, ...rest } = o;
        return { ...rest, receipt_url };
      })
    );
    return { orders };
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "payment_verified", "shipped", "delivered"]),
      })
      .parse(input)
  )
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { error } = await admin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Could not update order status");
    return { ok: true as const };
  });

/* --------------------------------- products -------------------------------- */

const ProductInput = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  category: z.string().trim().min(1).max(60),
  price_cents: z.number().int().min(1).max(100_000_000),
  in_stock: z.boolean().optional(),
  image_urls: z.array(z.string().trim().max(600)).max(12).default([]),
});

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { data, error } = await admin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load products");
    return { products: data ?? [] };
  });

export const adminCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ProductInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const slugBase = data.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${slugBase || "product"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await admin.from("products").insert({
      slug,
      name: data.name,
      category: data.category,
      description: data.description,
      subtitle: data.category,
      price_cents: data.price_cents,
      color: "sand",
      image_url: data.image_urls[0] ?? "",
      image_urls: data.image_urls,
      in_stock: true,
      sort_order: 100,
    });
    if (error) throw new Error("Could not create product");
    return { ok: true as const };
  });

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    ProductInput.extend({ id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { error } = await admin
      .from("products")
      .update({
        name: data.name,
        description: data.description,
        category: data.category,
        subtitle: data.category,
        price_cents: data.price_cents,
        in_stock: data.in_stock ?? true,
        image_url: data.image_urls[0] ?? "",
        image_urls: data.image_urls,
      })
      .eq("id", data.id);
    if (error) throw new Error("Could not update product");
    return { ok: true as const };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { error } = await admin.from("products").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete product");
    return { ok: true as const };
  });

/** Admin-only, server-validated image upload into the public product bucket. */
export const adminUploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => {
    if (!(input instanceof FormData)) throw new Error("Invalid upload");
    return input;
  })
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const file = data.get("file");
    const folder = String(data.get("folder") ?? "").replace(/[^a-z0-9-]/g, "");
    if (!(file instanceof File)) throw new Error("Select an image");
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      throw new Error("Image must be smaller than 5MB");
    }
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensions[file.type];
    if (!extension) throw new Error("Use a JPG, PNG, or WebP image");

    const path = `${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${extension}`;
    const { error } = await admin.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Could not upload image");
    const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

/* --------------------------------- giveaway -------------------------------- */

export const adminGiveawayData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const [entries, winners, prizes] = await Promise.all([
      admin.from("giveaway_entries" as never).select("*").order("created_at", { ascending: false }).limit(1000),
      admin.from("giveaway_winners" as never).select("*").order("drawn_at", { ascending: false }).limit(200),
      admin.from("giveaway_prizes" as never).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (entries.error || winners.error || prizes.error) {
      throw new Error("Could not load giveaway data");
    }
    return {
      entries: (entries.data ?? []) as unknown[],
      winners: (winners.data ?? []) as unknown[],
      prizes: (prizes.data ?? []) as unknown[],
    };
  });

const PrizeInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  prize_value: z.string().trim().max(80).default(""),
  image_url: z.string().trim().max(600).nullable().optional(),
  end_date: z.string().trim().max(40).nullable().optional(),
  is_active: z.boolean().default(false),
});

export const adminSavePrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PrizeInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const payload = {
      title: data.title,
      description: data.description ?? null,
      prize_value: data.prize_value ?? "",
      image_url: data.image_url ?? null,
      end_date: data.end_date ?? null,
      is_active: data.is_active,
    };
    const query = data.id
      ? admin.from("giveaway_prizes" as never).update(payload as never).eq("id", data.id)
      : admin.from("giveaway_prizes" as never).insert(payload as never);
    const { error } = await query;
    if (error) throw new Error("Could not save prize");
    return { ok: true as const };
  });

export const adminActivatePrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { error } = await admin
      .from("giveaway_prizes" as never)
      .update({ is_active: true } as never)
      .eq("id", data.id);
    if (error) throw new Error("Could not activate prize");
    return { ok: true as const };
  });

export const adminDeletePrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { error } = await admin
      .from("giveaway_prizes" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Could not delete prize");
    return { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin, receiptPath, validateImage, isLawfulMerchandise } from "@/lib/security-policy";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ORDER_STATUSES, canTransitionOrderStatus } from "@/lib/order-status";

type AuthedContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

/**
 * Verifies the caller holds the `admin` role (checked through the user's own
 * RLS-scoped client) and only then hands back the privileged service client.
 */
async function requireAdmin(context: AuthedContext) {
  await assertAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as AuthedContext;
    const { data } = await ctx.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (data) return { isAdmin: true };

    return { isAdmin: false };
  });

/* ---------------------------------- orders --------------------------------- */

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { data, error } = await admin
      .from("orders")
      .select(
        "id, order_number, email, phone_number, shipping_name, shipping_city, shipping_country, total_cents, status, payment_screenshot_url, created_at, notified_at"
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
            .createSignedUrl(path, 300);
          receipt_url = signed?.signedUrl ?? null;
        }
        const { payment_screenshot_url: _drop, ...rest } = o;
        return { ...rest, receipt_url };
      })
    );
    return { orders, notificationConfigured: Boolean(process.env["TELEGRAM_BOT_TOKEN"] && process.env["TELEGRAM_CHAT_ID"]) };
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
      })
      .parse(input)
  )
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context as unknown as AuthedContext);
    const { data: order, error: lookupError } = await admin.from("orders")
      .select("id,status").eq("id", data.id).maybeSingle();
    const { data: items, error: itemsError } = await admin.from("order_items")
      .select("product_id").eq("order_id", data.id);
    const { data: merchandise, error: productError } = await admin.from("products")
      .select("id,category,name,slug,description").in("id", (items ?? []).map(item => item.product_id));
    if (lookupError || itemsError || productError || !order || !items?.length ||
        items.some(item => !merchandise?.some(product => product.id === item.product_id && isLawfulMerchandise(product)))) {
      throw new Error("Status changes are paused for controlled or unverified merchandise orders.");
    }
    if (!canTransitionOrderStatus(order.status, data.status)) {
      throw new Error("Order status must advance one stage at a time.");
    }
    const { error } = await admin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id).eq("status", order.status).select("id");
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
    const extension = await validateImage(file);

    const path = `${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${extension}`;
    const { error } = await admin.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Could not upload image");
    const { data: pub } = admin.storage.from("product-images").getPublicUrl(path);
    const browserBase = process.env["VITE_SUPABASE_URL"];
    return { url: browserBase ? `${browserBase}/storage/v1/object/public/product-images/${path}` : pub.publicUrl };
  });

/* --------------------------------- giveaway -------------------------------- */

export type AdminEntry = {
  id: string;
  order_id: string;
  phone_number: string | null;
  customer_name: string;
  month_key: string;
  created_at: string;
};
export type AdminWinner = {
  id: string;
  month_key: string;
  customer_name: string;
  phone_number: string | null;
  order_id: string | null;
  drawn_at: string;
  drawn_manually: boolean;
};
export type AdminPrize = {
  id: string;
  title: string;
  description: string | null;
  prize_value: string;
  image_url: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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
      entries: (entries.data ?? []) as unknown as AdminEntry[],
      winners: (winners.data ?? []) as unknown as AdminWinner[],
      prizes: (prizes.data ?? []) as unknown as AdminPrize[],
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

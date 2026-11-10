export type Merchandise = { category?: string; name?: string; slug?: string; description?: string };

/** Fail closed: only apparel is currently unambiguously non-controlled. */
export function isLawfulMerchandise(product: Merchandise): boolean {
  const text = `${product.name ?? ""} ${product.slug ?? ""} ${product.description ?? ""}`;
  return product.category?.trim().toLowerCase() === "streetwear" &&
    !/cannabis|marijuana|flower|weed|thc|cbd|edible|pre.?roll|haze|kush|ဆေးခြောက်/i.test(text);
}

export function receiptPath(stored: string | null): string | null {
  if (!stored) return null;
  const marker = "/storage/v1/object/public/payment-screenshots/";
  const candidate = stored.includes(marker) ? stored.split(marker)[1] : stored;
  if (!candidate || candidate.includes("..") || /[?#%\\]/.test(candidate)) return null;
  return /^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(candidate) ? candidate : null;
}

export async function assertAdmin(context: {
  supabase: import('@supabase/supabase-js').SupabaseClient<import('@/integrations/supabase/types').Database>; userId: string;
}): Promise<void> {
  const { data, error } = await context.supabase.from("user_roles").select("role")
    .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Staff authorization required.");
}

export async function validateImage(file: File): Promise<string> {
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5MB");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const extension = file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg"
    : file.type === "image/png" && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) ? "png"
    : file.type === "image/webp" && new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP" ? "webp" : null;
  if (!extension || !/\.(jpe?g|png|webp)$/i.test(file.name) ||
      !(extension === "jpg" ? /\.jpe?g$/i : new RegExp(`\\.${extension}$`, "i")).test(file.name)) {
    throw new Error("Use a valid JPG, PNG, or WebP image");
  }
  return extension;
}
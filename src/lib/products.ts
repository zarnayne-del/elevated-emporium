import tee from "@/assets/product-tee.jpg";
import jar from "@/assets/product-jar.jpg";
import grinder from "@/assets/product-grinder.jpg";
import trousers from "@/assets/product-trousers.jpg";
import lighter from "@/assets/product-lighter.jpg";
import hoodie from "@/assets/product-hoodie.jpg";

export const productImages: Record<string, string> = {
  "architectural-tee": tee,
  "solaris-haze": jar,
  "precision-grinder": grinder,
  "field-trousers": trousers,
  "soft-flame-lighter": lighter,
  "atelier-hoodie": hoodie,
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  price_cents: number;
  color: string;
  in_stock: boolean;
  sort_order: number;
  image_url?: string | null;
  image_path?: string | null;
  image_urls?: string[] | null;
};

// USD cents → MMK display. 1 USD ≈ 3500 MMK (adjust as needed).
export const USD_TO_MMK = 3500;
export const formatPrice = (cents: number) => {
  const mmk = Math.round((cents / 100) * USD_TO_MMK);
  return `${mmk.toLocaleString("en-US")} Ks`;
};

export const productImages_ = (p: Pick<Product, "slug" | "image_url" | "image_path" | "image_urls">): string[] => {
  const arr = (p.image_urls ?? []).filter(Boolean);
  if (arr.length) return arr;
  const single = p.image_url || p.image_path || productImages[p.slug];
  return single ? [single] : [];
};

export const productImage = (p: Pick<Product, "slug" | "image_url" | "image_path" | "image_urls">) =>
  productImages_(p)[0] ?? "";

export const tileBg = (color: string) => {
  switch (color) {
    case "forest": return "bg-forest";
    case "moss": return "bg-moss";
    case "safety": return "bg-safety";
    case "sand":
    default: return "bg-sand";
  }
};

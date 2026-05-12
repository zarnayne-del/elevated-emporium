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
};

export const formatPrice = (cents: number) =>
  `$${(cents / 100).toFixed(2)}`;

export const tileBg = (color: string) => {
  switch (color) {
    case "forest": return "bg-forest";
    case "moss": return "bg-moss";
    case "safety": return "bg-safety";
    case "sand":
    default: return "bg-sand";
  }
};

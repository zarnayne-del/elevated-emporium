import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { type Product, productImage, formatPrice, tileBg } from "@/lib/products";

const search = z.object({
  category: z.enum(["Flower", "Streetwear", "Accessories"]).optional(),
});

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Shop — Kush & Cotton" },
      {
        name: "description",
        content:
          "Browse premium cannabis flower, streetwear apparel, and curated accessories from Kush & Cotton.",
      },
    ],
  }),
});

const CATEGORIES = ["All", "Flower", "Streetwear", "Accessories"] as const;

function ShopPage() {
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = category
    ? products?.filter((p) => p.category === category)
    : products;

  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-12 md:py-16 border-b-2 border-forest">
        <p className="label-mono text-safety mb-4">Catalog</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none">
          The Shop
        </h1>
      </section>

      <section className="px-6 md:px-8 py-10 border-b-2 border-forest flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c === "All" ? !category : c === category;
          return (
            <button
              key={c}
              onClick={() =>
                navigate({
                  search: c === "All" ? {} : { category: c },
                })
              }
              className={`px-5 py-2 border-2 border-forest font-display uppercase text-[11px] tracking-[0.2em] transition-colors cursor-pointer ${
                active ? "bg-forest text-sand" : "bg-sand text-forest hover:bg-forest hover:text-sand"
              }`}
            >
              {c}
            </button>
          );
        })}
      </section>

      <section className="px-6 md:px-8 py-12 md:py-16">
        {isLoading && (
          <p className="label-mono text-forest/60">Loading inventory…</p>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {filtered?.map((p) => (
            <Link
              key={p.id}
              to="/products/$slug"
              params={{ slug: p.slug }}
              className="group"
            >
              <div className={`aspect-square ${tileBg(p.color)} border-2 border-forest mb-4 overflow-hidden`}>
                <img
                  src={productImage(p)}
                  alt={p.name}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="label-mono text-forest/50 mb-1">{p.category}</p>
                  <h3 className="font-display text-lg md:text-xl uppercase mb-1 truncate">
                    {p.name}
                  </h3>
                  <p className="text-xs uppercase tracking-wider text-forest/60 truncate">
                    {p.subtitle}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {formatPrice(p.price_cents)}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {filtered && filtered.length === 0 && (
          <p className="label-mono text-forest/60">No products in this category yet.</p>
        )}
      </section>
    </SiteLayout>
  );
}

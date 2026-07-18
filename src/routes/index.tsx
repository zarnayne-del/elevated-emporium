import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { GiveawaySection } from "@/components/GiveawaySection";
import { type Product, productImage, formatPrice, tileBg } from "@/lib/products";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Kush & Cotton — Elevated Botanics, Collection 01" },
      {
        name: "description",
        content:
          "A symbiotic fusion of premium cultivars and architectural silhouettes. Designed for the high-functioning aestheticist.",
      },
    ],
  }),
});

function HomePage() {
  const { data: products } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .limit(4);
      if (error) throw error;
      return data as Product[];
    },
  });

  return (
    <SiteLayout>
      {/* Hero */}
      <header className="border-b-2 border-forest p-8 md:p-20 lg:p-28">
        <span className="label-mono text-safety mb-6 block">
          Collection 01 / SS24
        </span>
        <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-display font-bold uppercase leading-[0.85] tracking-tighter mb-8">
          Elevated<br />Botanics
        </h1>
        <p className="max-w-xl text-base md:text-lg leading-relaxed mb-10 text-forest/80">
          A symbiotic fusion of premium cultivars and architectural
          silhouettes. Designed for the high-functioning aestheticist.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/shop" search={{ category: "Flower" }} className="btn-forest">
            Shop Flower
          </Link>
          <Link to="/shop" search={{ category: "Streetwear" }} className="btn-outline">
            Apparel
          </Link>
        </div>
      </header>

      {/* Featured products */}
      <section className="px-6 md:px-8 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-12">
          <div>
            <p className="label-mono text-forest/60 mb-3">New Arrivals</p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-tighter">
              The Essentials
            </h2>
          </div>
          <Link
            to="/shop"
            className="label-mono border-b-2 border-forest pb-1 self-start md:self-auto hover:text-safety hover:border-safety transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {products?.map((p) => (
            <Link
              key={p.id}
              to="/products/$slug"
              params={{ slug: p.slug }}
              className="group"
            >
              <div className={`aspect-[3/4] ${tileBg(p.color)} border-2 border-forest mb-4 overflow-hidden`}>
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
                  <h3 className="font-display text-base md:text-lg uppercase mb-1 truncate">
                    {p.name}
                  </h3>
                  <p className="label-mono text-forest/60 truncate">
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
      </section>

      {/* Manifesto / system block */}
      <section className="px-6 md:px-8 py-20 md:py-28 bg-forest text-sand border-t-2 border-forest">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div>
            <p className="label-mono text-safety mb-6">Order Logic</p>
            <h2 className="font-display text-4xl md:text-5xl uppercase mb-8 leading-none tracking-tighter">
              Dispatched in real time.
            </h2>
            <p className="text-sand/70 max-w-lg leading-relaxed mb-10">
              Every successful checkout triggers an immediate secure webhook to
              our private dispatch bot. No spreadsheets, no delays — your order
              is acknowledged within seconds.
            </p>
            <div className="border border-sand/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-2 bg-safety" />
                <span className="label-mono">Webhook · Telegram_Bot_v2</span>
              </div>
              <pre className="text-[10px] font-mono text-sand/50 leading-relaxed overflow-x-auto">{`{
  "event": "order.success",
  "order": "KC-9921",
  "items": [
    { "sku": "TEE-01-M", "qty": 1 },
    { "sku": "FLW-04",  "qty": 2 }
  ],
  "total": 19500
}`}</pre>
            </div>
          </div>

          <div className="lg:border-l border-sand/20 lg:pl-20 flex flex-col justify-between">
            <div>
              <p className="label-mono text-safety mb-6">Checkout Security</p>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="text-safety font-display font-bold">01</span>
                  <span className="text-sm uppercase tracking-wider">
                    Server-side validation on every transaction
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-safety font-display font-bold">02</span>
                  <span className="text-sm uppercase tracking-wider">
                    Strict null policy across all order tables
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-safety font-display font-bold">03</span>
                  <span className="text-sm uppercase tracking-wider">
                    Real-time fulfillment notifications via Telegram
                  </span>
                </li>
              </ul>
            </div>
            <div className="pt-12">
              <Link
                to="/shop"
                className="block w-full text-center py-5 bg-sand text-forest font-display uppercase tracking-[0.2em] text-xs hover:bg-safety hover:text-sand transition-colors"
              >
                Enter the Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

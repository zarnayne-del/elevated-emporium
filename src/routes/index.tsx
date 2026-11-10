import { brandHead } from "@/lib/brand-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/product-fetch";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { GiveawaySection } from "@/components/GiveawaySection";
import { type Product, productImage, formatPrice, tileBg } from "@/lib/products";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => brandHead("WALKI TALKIE — Streetwear", "WALKI TALKIE apparel, customer service and private staff management.", "/"),
});

function HomePage() {
  const {
    data: products,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ limit: 4 }),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 60_000,
  });

  return (
    <SiteLayout>
      {/* Hero */}
      <header className="border-b-2 border-forest p-6 md:p-16 lg:p-20">
        <span className="label-mono text-safety mb-6 block">
          WALKI TALKIE / Streetwear
        </span>
        <h1 className="text-5xl md:text-8xl lg:text-9xl font-display font-bold uppercase leading-[0.85] tracking-tighter mb-8">
          WALKI<br />TALKIE
        </h1>
        <p className="max-w-xl text-base md:text-lg leading-relaxed mb-4 text-forest/80">
          ဝေါ်ကိတော်ကီ
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/shop" search={{ category: "Streetwear" }} className="btn-outline">
            Apparel
          </Link>
        </div>
      </header>

      {/* Monthly Giveaway */}
      <GiveawaySection />

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
          {isLoading && (
            <p className="col-span-full label-mono text-forest/60">Loading inventory…</p>
          )}
          {isError && (
            <div className="col-span-full border-2 border-forest p-6">
              <p className="label-mono text-safety mb-2">Connection problem</p>
              <p className="text-sm text-forest/70 mb-4">
                {(error as Error)?.message ??
                  "We couldn't reach the catalog. This can happen on a weak mobile data signal."}
              </p>
              <Button onClick={() => refetch()} className="btn-forest" disabled={isFetching}>
                {isFetching ? "Retrying…" : "Retry"}
              </Button>
            </div>
          )}
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
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
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

      <section className="px-6 md:px-8 py-16 bg-forest text-sand border-t-2 border-forest">
        <p className="label-mono text-safety mb-4">Customer Service</p>
        <h2 className="font-display text-3xl md:text-4xl uppercase mb-6">Here for your questions.</h2>
        <p className="max-w-xl leading-relaxed mb-8">Purchasing and order-linked giveaways are paused. Existing order records remain available to authorized staff. For private order assistance, contact customer service.</p>
        <Link to="/track" className="btn-outline border-sand text-sand">Order Assistance</Link>
      </section>
    </SiteLayout>
  );
}

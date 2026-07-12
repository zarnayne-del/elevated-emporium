import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { type Product, productImages_, formatPrice, tileBg } from "@/lib/products";
import { addToCart } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="px-8 py-32 text-center">
        <h1 className="font-display text-5xl uppercase mb-4">Not Found</h1>
        <Link to="/shop" className="btn-forest mt-6">Back to shop</Link>
      </div>
    </SiteLayout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["products", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Product;
    },
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="px-8 py-32 label-mono">Loading…</div>
      </SiteLayout>
    );
  }
  if (isError || !product) {
    return (
      <SiteLayout>
        <div className="px-8 py-32 text-center">
          <h1 className="font-display text-3xl uppercase">Product not found</h1>
          <Link to="/shop" className="btn-forest mt-6">Back to shop</Link>
        </div>
      </SiteLayout>
    );
  }

  const handleAdd = () => {
    addToCart({
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      unit_price_cents: product.price_cents,
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    handleAdd();
    navigate({ to: "/checkout" });
  };

  const images = productImages_(product);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeImg = images[activeIdx] ?? images[0];

  return (
    <SiteLayout>
      <article className="grid grid-cols-1 lg:grid-cols-2 border-b-2 border-forest">
        <div className={`${tileBg(product.color)} border-r-0 lg:border-r-2 border-forest p-8 md:p-16`}>
          <div className="flex items-center justify-center">
            {activeImg && (
              <img
                src={activeImg}
                alt={product.name}
                width={800}
                height={800}
                className="w-full max-w-lg"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-6 flex gap-3 flex-wrap justify-center">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveIdx(i)}
                  className={`w-16 h-16 border-2 overflow-hidden ${i === activeIdx ? "border-safety" : "border-forest"}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-8 md:p-16 flex flex-col">
          <p className="label-mono text-safety mb-4">{product.category}</p>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter leading-none mb-4">
            {product.name}
          </h1>
          <p className="text-sm uppercase tracking-wider text-forest/60 mb-8">
            {product.subtitle}
          </p>
          <p className="text-3xl font-display tabular-nums mb-10">
            {formatPrice(product.price_cents)}
          </p>
          <p className="text-base leading-relaxed text-forest/80 mb-10 max-w-md">
            {product.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <button onClick={handleAdd} className="btn-outline flex-1">
              Add to Cart
            </button>
            <button onClick={handleBuyNow} className="btn-forest flex-1">
              Buy Now
            </button>
          </div>
          <div className="mt-auto pt-8 border-t border-forest/20 grid grid-cols-2 gap-6 label-mono text-forest/70">
            <div>
              <p className="text-forest mb-1">Shipping</p>
              <p>Free over 500,000 Ks</p>
            </div>
            <div>
              <p className="text-forest mb-1">Returns</p>
              <p>30 days, unopened</p>
            </div>
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}

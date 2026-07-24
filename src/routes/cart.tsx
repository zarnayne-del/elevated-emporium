import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useCart, setQuantity, removeFromCart } from "@/lib/cart-store";
import { formatPrice, productImages } from "@/lib/products";
// productImages used for legacy local slug images; cart items keep slug only

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart — Walki Talkie" }] }),
});

function CartPage() {
  const { items, subtotal, count } = useCart();
  // Shipping is calculated at checkout after the customer enters a location.
  const total = subtotal;

  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-12 md:py-16 border-b-2 border-forest flex justify-between items-end">
        <div>
          <p className="label-mono text-safety mb-4">Your Bag</p>
          <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tighter leading-none">
            Cart ({count})
          </h1>
        </div>
        <Link to="/shop" className="label-mono hidden md:inline border-b-2 border-forest pb-1 hover:text-safety hover:border-safety">
          Continue Shopping →
        </Link>
      </section>

      {items.length === 0 ? (
        <div className="px-8 py-32 text-center">
          <p className="label-mono text-forest/60 mb-6">Your cart is empty.</p>
          <Link to="/shop" className="btn-forest">Browse the Catalog</Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-3 border-b-2 border-forest">
          <div className="lg:col-span-2 lg:border-r-2 border-forest divide-y-2 divide-forest">
            {items.map((it) => (
              <div key={it.product_id} className="flex gap-6 p-6 md:p-8">
                <div className="w-24 h-24 md:w-32 md:h-32 border-2 border-forest bg-sand shrink-0 overflow-hidden">
                  <img
                    src={productImages[it.slug]}
                    alt={it.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link
                        to="/products/$slug"
                        params={{ slug: it.slug }}
                        className="font-display text-lg md:text-xl uppercase hover:text-safety"
                      >
                        {it.name}
                      </Link>
                      <p className="label-mono text-forest/60 mt-1">
                        {formatPrice(it.unit_price_cents)} each
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums whitespace-nowrap">
                      {formatPrice(it.unit_price_cents * it.quantity)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="inline-flex border-2 border-forest">
                      <button
                        onClick={() => setQuantity(it.product_id, it.quantity - 1)}
                        className="px-3 py-1 hover:bg-forest hover:text-sand transition-colors"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span className="px-4 py-1 tabular-nums label-mono self-center">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(it.product_id, it.quantity + 1)}
                        className="px-3 py-1 hover:bg-forest hover:text-sand transition-colors"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(it.product_id)}
                      className="label-mono hover:text-safety"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="p-6 md:p-8 bg-forest text-sand">
            <p className="label-mono text-safety mb-6">Order Summary</p>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-wider text-sand/70">Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-wider text-sand/70">Packing Fees</span>
                <span className="tabular-nums text-sand/60">Calculated at checkout</span>
              </div>
              <div className="border-t border-sand/20 pt-4 flex justify-between font-display text-2xl uppercase">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="block w-full text-center py-5 bg-sand text-forest font-display uppercase tracking-[0.2em] text-xs hover:bg-safety hover:text-sand transition-colors"
            >
              Secure Checkout →
            </Link>
            <p className="label-mono text-sand/40 mt-6 text-center">
              Free shipping within Yangon
            </p>
          </aside>
        </section>
      )}
    </SiteLayout>
  );
}

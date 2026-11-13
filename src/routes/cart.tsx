import { brandHead } from "@/lib/brand-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () =>
    brandHead(
      "Cart — Walki Talkie",
      "Walki Talkie purchasing is paused; saved items cannot be checked out.",
      "/cart",
    ),
});

function CartPage() {
  return (
    <SiteLayout>
      <section className="max-w-3xl px-6 md:px-8 py-12 md:py-16 space-y-6">
        <h1 className="font-display text-4xl uppercase">Purchasing paused</h1>
        <p className="leading-relaxed">
          Saved items cannot be purchased. No payments, receipt uploads or order submissions are
          accepted. Existing records remain unchanged.
        </p>
        <Link to="/shop" className="btn-outline">
          Apparel Catalog
        </Link>
      </section>
    </SiteLayout>
  );
}

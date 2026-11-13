import { brandHead } from "@/lib/brand-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () =>
    brandHead(
      "Purchasing Paused — Walki Talkie",
      "Purchasing is paused pending merchandise compliance and secure processing.",
      "/checkout",
    ),
});
function CheckoutPage() {
  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-16 max-w-3xl">
        <h1 className="font-display text-4xl uppercase mb-6">Purchasing paused</h1>
        <p className="mb-8 leading-relaxed">
          The current Flower catalog is browse-only pending local legal compliance. No payments or
          receipt uploads are accepted. Purchasing may only resume for verified lawful,
          non-controlled merchandise.
        </p>
        <Link to="/shop" className="btn-outline">
          Browse Catalog
        </Link>
      </section>
    </SiteLayout>
  );
}

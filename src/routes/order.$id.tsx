import { brandHead } from "@/lib/brand-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
  head: ({ params }) =>
    brandHead(
      "Order Assistance — Walki Talkie",
      "Private Walki Talkie order assistance; payment and dispatch require staff verification.",
      `/order/${params.id}`,
    ),
});
function OrderPage() {
  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-24 max-w-2xl mx-auto">
        <h1 className="font-display text-4xl uppercase mb-6">Order Assistance</h1>
        <p className="mb-8">
          This link does not confirm payment or dispatch. Order details are private and available
          through verified customer service assistance.
        </p>
        <Link to="/track" className="btn-outline">
          Contact Support
        </Link>
      </section>
    </SiteLayout>
  );
}

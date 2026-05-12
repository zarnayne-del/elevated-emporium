import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/order/$id")({
  component: OrderConfirmedPage,
  head: () => ({ meta: [{ title: "Order Confirmed — Kush & Cotton" }] }),
});

function OrderConfirmedPage() {
  const { id } = Route.useParams();
  const short = id.slice(0, 8).toUpperCase();
  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-24 md:py-40 text-center max-w-2xl mx-auto">
        <p className="label-mono text-safety mb-6">Order Confirmed</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none mb-8">
          Dispatched.
        </h1>
        <p className="text-base md:text-lg text-forest/80 leading-relaxed mb-10">
          Your order has been received and a real-time notification has been
          sent to our fulfillment team via Telegram. You'll receive a shipping
          confirmation by email shortly.
        </p>
        <div className="border-2 border-forest inline-block px-8 py-4 mb-12">
          <p className="label-mono text-forest/60 mb-1">Reference</p>
          <p className="font-display text-2xl tracking-widest">#{short}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-outline">Keep Shopping</Link>
          <Link to="/" className="btn-forest">Return Home</Link>
        </div>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/order/$id")({
  component: OrderConfirmedPage,
  head: () => ({ meta: [{ title: "Order Confirmed — Walki Talkie" }] }),
});

function OrderConfirmedPage() {
  const { id } = Route.useParams();
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("phone_number")
          .eq("id", id)
          .maybeSingle();
        if (!cancelled) setPhone(data?.phone_number ?? null);
      } catch (e) {
        console.error("Failed to load order phone:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-24 md:py-40 text-center max-w-2xl mx-auto">
        <p className="label-mono text-safety mb-6">Order Confirmed</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none mb-8">
          Dispatched.
        </h1>
        <p className="text-base md:text-lg text-forest/80 leading-relaxed mb-10">
          Your order has been received and a real-time notification has been
          sent to our fulfillment team via Telegram. Save your Tracking ID
          below — you can look up your order any time from the Track page.
        </p>
        <div className="border-2 border-forest inline-block px-8 py-4 mb-12">
          <p className="label-mono text-forest/60 mb-1">Tracking ID</p>
          <p className="font-display text-2xl tracking-widest">
            {loading ? "…" : phone ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/track" className="btn-outline">Track Order</Link>
          <Link to="/shop" className="btn-outline">Keep Shopping</Link>
          <Link to="/" className="btn-forest">Return Home</Link>
        </div>
      </section>
    </SiteLayout>
  );
}

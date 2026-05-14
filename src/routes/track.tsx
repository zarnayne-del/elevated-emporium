import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { trackOrder } from "@/lib/checkout.functions";
import { formatPrice } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/track")({
  component: TrackPage,
  head: () => ({
    meta: [
      { title: "Track Order — Kush & Cotton" },
      {
        name: "description",
        content: "Look up the status of your Kush & Cotton orders by phone number.",
      },
    ],
  }),
});

type OrderResult = {
  id: string;
  order_number: string;
  status: string;
  shipping_name: string;
  shipping_city: string;
  shipping_address: string;
  total_cents: number;
  created_at: string;
  notified_at: string | null;
  phone_number: string | null;
};

const STATUS_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Payment Verified" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

function statusIndex(status: string) {
  const i = STATUS_STEPS.findIndex((s) => s.key === status.toLowerCase());
  return i === -1 ? 0 : i;
}

function TrackPage() {
  const track = useServerFn(trackOrder);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [searched, setSearched] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await track({ data: { phone_number: phone.trim() } });
      setOrders((res.orders as OrderResult[]) ?? []);
      setSearched(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-16 border-b-2 border-forest">
        <p className="label-mono text-safety mb-4">Order Tracking</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none">
          Track Order
        </h1>
        <p className="mt-6 max-w-xl text-forest/70">
          Enter the phone number you used at checkout to see all of your
          orders and their current status.
        </p>
      </section>

      <section className="px-6 md:px-8 py-12 border-b-2 border-forest">
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+95 9 123 456 789"
            className="flex-1 bg-sand border-2 border-forest px-4 py-3 text-sm uppercase tracking-wider focus:outline-none focus:bg-safety/10"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-forest text-sand font-display uppercase tracking-[0.2em] text-xs hover:bg-safety transition-colors disabled:opacity-60"
          >
            {loading ? "Searching…" : "Track →"}
          </button>
        </form>
      </section>

      {searched && (
        <section className="px-6 md:px-8 py-12 space-y-6">
          {orders.length === 0 ? (
            <p className="label-mono text-forest/60">
              No orders found for that phone number. Double-check and try again.
            </p>
          ) : (
            <>
              <p className="label-mono text-safety">
                {orders.length} order{orders.length === 1 ? "" : "s"} found
              </p>
              {orders.map((order) => (
                <div key={order.id} className="border-2 border-forest max-w-3xl">
                  <div className="bg-forest text-sand px-6 py-4 flex justify-between items-center label-mono">
                    <span>{order.order_number}</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex flex-wrap justify-between gap-4 text-sm">
                      <div>
                        <p className="label-mono text-forest/60 mb-1">Customer</p>
                        <p className="uppercase tracking-wider">{order.shipping_name}</p>
                      </div>
                      <div>
                        <p className="label-mono text-forest/60 mb-1">Destination</p>
                        <p className="uppercase tracking-wider">{order.shipping_city}</p>
                      </div>
                      <div>
                        <p className="label-mono text-forest/60 mb-1">Total</p>
                        <p className="font-display text-lg tabular-nums">
                          {formatPrice(order.total_cents)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="label-mono text-safety mb-3">Status</p>
                      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {STATUS_STEPS.map((s, i) => {
                          const active = i <= statusIndex(order.status);
                          return (
                            <li
                              key={s.key}
                              className={`border-2 px-3 py-3 text-center label-mono ${
                                active
                                  ? "bg-forest text-sand border-forest"
                                  : "bg-sand text-forest/40 border-forest/20"
                              }`}
                            >
                              <span className="block text-[10px] mb-1">
                                Step {i + 1}
                              </span>
                              {s.label}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </SiteLayout>
  );
}

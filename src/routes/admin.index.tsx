import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/")({
  component: AdminOrdersPage,
});

type Order = {
  id: string;
  order_number: string;
  email: string | null;
  phone_number: string | null;
  shipping_name: string;
  shipping_city: string;
  shipping_country: string;
  total_cents: number;
  status: string;
  payment_screenshot_url: string | null;
  created_at: string;
};

function AdminOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, email, phone_number, shipping_name, shipping_city, shipping_country, total_cents, status, payment_screenshot_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  return (
    <section>
      <header className="mb-8">
        <p className="label-mono text-safety mb-2">Orders Management</p>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter">
          Incoming Orders
        </h1>
      </header>

      {isLoading ? (
        <p className="label-mono text-forest/60">Loading…</p>
      ) : !orders || orders.length === 0 ? (
        <div className="border-2 border-forest p-12 text-center">
          <p className="label-mono text-forest/60">No orders yet.</p>
        </div>
      ) : (
        <div className="border-2 border-forest overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-forest text-sand">
              <tr className="label-mono text-left">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-forest">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-forest/5">
                  <td className="px-4 py-3 font-display tracking-wider">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.shipping_name}</div>
                    <div className="label-mono text-forest/60">{o.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {o.shipping_city}, {o.shipping_country}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatPrice(o.total_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`label-mono px-2 py-1 ${
                      o.status === "confirmed" ? "bg-forest text-sand" : "bg-safety text-sand"
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.payment_screenshot_url ? (
                      <a
                        href={o.payment_screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="label-mono underline underline-offset-4 hover:text-safety"
                      >
                        View ↗
                      </a>
                    ) : (
                      <span className="label-mono text-forest/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

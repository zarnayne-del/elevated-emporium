import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatPrice } from "@/lib/products";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/admin.functions";
import { safeCall } from "@/lib/server-call";
import { toast } from "sonner";

const STATUS_OPTIONS = ["pending", "payment_verified", "shipped", "delivered"] as const;

export const Route = createFileRoute("/admin/")({
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const qc = useQueryClient();
  const listOrders = useServerFn(adminListOrders);
  const updateOrderStatus = useServerFn(adminUpdateOrderStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => listOrders(),
  });
  const orders = data?.orders;

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus({
        data: { id, status: status as (typeof STATUS_OPTIONS)[number] },
      });
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

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
                    <div className="label-mono text-forest/60">{o.phone_number ?? o.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {o.shipping_city}, {o.shipping_country}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatPrice(o.total_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={STATUS_OPTIONS.includes(o.status as typeof STATUS_OPTIONS[number]) ? o.status : "pending"}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="label-mono bg-sand border-2 border-forest px-2 py-1 focus:outline-none focus:bg-safety/10"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {o.receipt_url ? (
                      <a
                        href={o.receipt_url}
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

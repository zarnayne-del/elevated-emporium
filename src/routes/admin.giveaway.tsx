import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { drawGiveawayWinner } from "@/lib/giveaway.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/giveaway")({
  component: AdminGiveawayPage,
});

type Prize = {
  id: string;
  title: string;
  description: string | null;
  prize_value: string;
  image_url: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


type Entry = {
  id: string;
  order_id: string;
  phone_number: string | null;
  customer_name: string;
  month_key: string;
  created_at: string;
};
type Winner = {
  id: string;
  month_key: string;
  customer_name: string;
  phone_number: string | null;
  order_id: string | null;
  drawn_at: string;
  drawn_manually: boolean;
};

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function AdminGiveawayPage() {
  const qc = useQueryClient();
  const draw = useServerFn(drawGiveawayWinner);
  const [drawing, setDrawing] = useState(false);
  const month = currentMonthKey();

  const { data: entries } = useQuery({
    queryKey: ["admin", "giveaway_entries"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_entries" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  const { data: winners } = useQuery({
    queryKey: ["admin", "giveaway_winners"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_winners" as never)
        .select("*")
        .order("drawn_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Winner[];
    },
  });

  const currentMonthEntries = (entries ?? []).filter((e) => e.month_key === month);

  const onDraw = async () => {
    setDrawing(true);
    try {
      const res = await draw({ data: {} });
      if (!res.ok) {
        toast.error(res.message);
      } else if (res.already) {
        toast.info("Winner for this month has already been drawn.");
      } else {
        toast.success("Winner drawn!");
      }
      qc.invalidateQueries({ queryKey: ["admin", "giveaway_winners"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draw failed");
    } finally {
      setDrawing(false);
    }
  };

  return (
    <section className="space-y-10">
      <header>
        <p className="label-mono text-safety mb-2">Monthly Giveaway</p>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter">
          Giveaway Dashboard
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total Entries (All Time)" value={String(entries?.length ?? 0)} />
        <Stat label={`Entries This Month (${month})`} value={String(currentMonthEntries.length)} />
        <Stat label="Winners Drawn" value={String(winners?.length ?? 0)} />
      </div>

      <div className="border-2 border-forest p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <p className="font-display uppercase text-lg tracking-tight">
            Draw Winner for {month}
          </p>
          <p className="label-mono text-forest/60 mt-1">
            Runs automatically on the last day of each month. You can also draw manually.
          </p>
        </div>
        <button
          onClick={onDraw}
          disabled={drawing || currentMonthEntries.length === 0}
          className="btn-forest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {drawing ? "Drawing…" : "Draw Winner Now"}
        </button>
      </div>

      <div>
        <h2 className="font-display uppercase text-2xl tracking-tighter mb-4">Previous Winners</h2>
        {!winners || winners.length === 0 ? (
          <div className="border-2 border-forest p-8 text-center label-mono text-forest/60">
            No winners drawn yet.
          </div>
        ) : (
          <div className="border-2 border-forest overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-forest text-sand label-mono text-left">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Winner</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Drawn At</th>
                  <th className="px-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-forest">
                {winners.map((w) => (
                  <tr key={w.id} className="hover:bg-forest/5">
                    <td className="px-4 py-3 font-display tracking-wider">{w.month_key}</td>
                    <td className="px-4 py-3 font-semibold">{w.customer_name}</td>
                    <td className="px-4 py-3">{w.phone_number ?? "—"}</td>
                    <td className="px-4 py-3 label-mono text-forest/60">
                      {new Date(w.drawn_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 label-mono">
                      {w.drawn_manually ? "manual" : "auto"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display uppercase text-2xl tracking-tighter mb-4">All Entries</h2>
        {!entries || entries.length === 0 ? (
          <div className="border-2 border-forest p-8 text-center label-mono text-forest/60">
            No entries yet — entries are created automatically for every order.
          </div>
        ) : (
          <div className="border-2 border-forest overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-forest text-sand label-mono text-left">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Entered</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-forest">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-forest/5">
                    <td className="px-4 py-3 font-display tracking-wider">{e.month_key}</td>
                    <td className="px-4 py-3 font-semibold">{e.customer_name}</td>
                    <td className="px-4 py-3">{e.phone_number ?? "—"}</td>
                    <td className="px-4 py-3 label-mono text-forest/60">
                      {e.order_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 label-mono text-forest/60">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-forest p-6">
      <p className="label-mono text-forest/60 mb-2">{label}</p>
      <p className="font-display text-4xl uppercase tracking-tighter">{value}</p>
    </div>
  );
}

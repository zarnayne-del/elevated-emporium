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

      <PrizeManager />


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

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function PrizeManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Prize | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prize_value: "",
    image_url: "",
    end_date: "",
    is_active: true,
  });

  const { data: prizes } = useQuery({
    queryKey: ["admin", "giveaway_prizes"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_prizes" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Prize[];
    },
  });

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? "",
        prize_value: editing.prize_value ?? "",
        image_url: editing.image_url ?? "",
        end_date: toDatetimeLocalValue(editing.end_date),
        is_active: editing.is_active,
      });
      setFile(null);
    }
  }, [editing]);

  const reset = () => {
    setEditing(null);
    setFile(null);
    setForm({ title: "", description: "", prize_value: "", image_url: "", end_date: "", is_active: true });
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!file) return form.image_url || null;
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `prizes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setSubmitting(true);
    try {
      const image_url = await uploadImage();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        prize_value: form.prize_value.trim(),
        image_url: image_url || null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await (supabase as never as typeof supabase)
          .from("giveaway_prizes" as never)
          .update(payload as never)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Prize updated");
      } else {
        const { error } = await (supabase as never as typeof supabase)
          .from("giveaway_prizes" as never)
          .insert(payload as never);
        if (error) throw error;
        toast.success("Prize created");
      }
      reset();
      qc.invalidateQueries({ queryKey: ["admin", "giveaway_prizes"] });
      qc.invalidateQueries({ queryKey: ["giveaway", "active-prize"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const activate = async (p: Prize) => {
    const { error } = await (supabase as never as typeof supabase)
      .from("giveaway_prizes" as never)
      .update({ is_active: true } as never)
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Prize activated");
    qc.invalidateQueries({ queryKey: ["admin", "giveaway_prizes"] });
    qc.invalidateQueries({ queryKey: ["giveaway", "active-prize"] });
  };

  const remove = async (p: Prize) => {
    if (!confirm(`Delete prize "${p.title}"?`)) return;
    const { error } = await (supabase as never as typeof supabase)
      .from("giveaway_prizes" as never)
      .delete()
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Prize deleted");
    qc.invalidateQueries({ queryKey: ["admin", "giveaway_prizes"] });
    qc.invalidateQueries({ queryKey: ["giveaway", "active-prize"] });
  };

  return (
    <div className="border-2 border-forest">
      <div className="px-6 py-4 border-b-2 border-forest bg-forest text-sand flex justify-between items-center">
        <h2 className="font-display uppercase text-xl tracking-tighter">Giveaway Prize Management</h2>
        {editing && (
          <button onClick={reset} className="label-mono hover:text-safety">
            + New Prize
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <p className="label-mono text-forest/60 mb-3">
            {editing ? `Editing: ${editing.title}` : "Add a new giveaway prize"}
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="label-mono text-forest/60">Title *</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="border-2 border-forest bg-sand px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-mono text-forest/60">Value (e.g. 150,000 Ks)</span>
          <input
            value={form.prize_value}
            onChange={(e) => setForm((f) => ({ ...f, prize_value: e.target.value }))}
            className="border-2 border-forest bg-sand px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="label-mono text-forest/60">Description</span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="border-2 border-forest bg-sand px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-mono text-forest/60">Prize image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="border-2 border-forest bg-sand px-3 py-2"
          />
          {form.image_url && !file && (
            <img src={form.image_url} alt="" className="mt-2 h-24 w-24 object-cover border-2 border-forest" />
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-mono text-forest/60">End date/time</span>
          <input
            type="datetime-local"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            className="border-2 border-forest bg-sand px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-5 w-5"
          />
          <span className="label-mono">Active (shown on public giveaway page)</span>
        </label>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" disabled={submitting} className="btn-forest disabled:opacity-50">
            {submitting ? "Saving…" : editing ? "Update Prize" : "Create Prize"}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="btn-outline">Cancel</button>
          )}
        </div>
      </form>

      <div className="border-t-2 border-forest">
        {(prizes ?? []).length === 0 ? (
          <div className="p-6 label-mono text-forest/60 text-center">No prizes yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-forest/5 label-mono text-left">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-forest">
              {(prizes ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-12 w-12 object-cover border border-forest" />
                    ) : (
                      <span className="text-2xl">🎁</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{p.title}</td>
                  <td className="px-4 py-3">{p.prize_value || "—"}</td>
                  <td className="px-4 py-3 label-mono text-forest/60">
                    {p.end_date ? new Date(p.end_date).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="label-mono bg-safety text-forest px-2 py-1">ACTIVE</span>
                    ) : (
                      <span className="label-mono text-forest/50">inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {!p.is_active && (
                      <button onClick={() => activate(p)} className="label-mono hover:text-safety">
                        Activate
                      </button>
                    )}
                    <button onClick={() => setEditing(p)} className="label-mono hover:text-safety">
                      Edit
                    </button>
                    <button onClick={() => remove(p)} className="label-mono hover:text-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

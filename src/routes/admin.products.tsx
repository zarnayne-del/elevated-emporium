import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, type Product, productImage, USD_TO_MMK } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function AdminProductsPage() {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = (fd.get("name") as string)?.trim();
    const description = (fd.get("description") as string)?.trim();
    const category = (fd.get("category") as string) || "Streetwear";
    const priceDollars = parseFloat(fd.get("price") as string);
    if (!name || !description || isNaN(priceDollars) || priceDollars <= 0) {
      toast.error("Fill all required fields with valid values");
      return;
    }
    setSubmitting(true);
    try {
      let image_url = "";
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        image_url = pub.publicUrl;
      }
      const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("products").insert({
        slug,
        name,
        category,
        description,
        subtitle: category,
        price_cents: Math.round(priceDollars * 100),
        color: "sand",
        image_url,
        in_stock: true,
        sort_order: 100,
      });
      if (error) throw error;
      toast.success("Product created");
      form.reset();
      setFile(null);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <section className="grid grid-cols-1 xl:grid-cols-5 gap-10">
      <div className="xl:col-span-2">
        <header className="mb-6">
          <p className="label-mono text-safety mb-2">Products Management</p>
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-tighter">
            New Product
          </h1>
        </header>
        <form onSubmit={onSubmit} className="border-2 border-forest p-6 space-y-5 bg-sand">
          <Field name="name" label="Name" required />
          <div className="grid grid-cols-2 gap-4">
            <Field name="price" label="Price (USD)" type="number" step="0.01" required />
            <label className="block">
              <span className="label-mono text-forest/60 block mb-2">Category</span>
              <select
                name="category"
                className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm"
                defaultValue="Streetwear"
              >
                <option>Streetwear</option>
                <option>Flower</option>
                <option>Accessories</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label-mono text-forest/60 block mb-2">Description</span>
            <textarea
              name="description"
              required
              rows={4}
              className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="label-mono text-forest/60 block mb-2">Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm file:mr-3 file:px-3 file:py-1 file:border-0 file:bg-forest file:text-sand file:label-mono"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="btn-forest w-full disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Insert Product"}
          </button>
        </form>
      </div>

      <div className="xl:col-span-3">
        <header className="mb-6">
          <p className="label-mono text-safety mb-2">Catalog</p>
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-tighter">
            All Products
          </h2>
        </header>
        {isLoading ? (
          <p className="label-mono text-forest/60">Loading…</p>
        ) : (
          <ul className="border-2 border-forest divide-y-2 divide-forest">
            {products?.map((p) => (
              <li key={p.id} className="flex items-center gap-4 p-3">
                <div className="w-16 h-16 border-2 border-forest bg-sand shrink-0 overflow-hidden">
                  <img src={productImage(p)} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display uppercase truncate">{p.name}</p>
                  <p className="label-mono text-forest/60">
                    {p.category} · {formatPrice(p.price_cents)}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(p.id)}
                  className="label-mono hover:text-safety"
                >
                  Delete
                </button>
              </li>
            ))}
            {products?.length === 0 && (
              <li className="p-6 text-center label-mono text-forest/60">
                No products yet.
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono text-forest/60 block mb-2">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm focus:outline-none focus:bg-safety/10"
      />
    </label>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { formatPrice, type Product, productImage, productImages_, USD_TO_MMK } from "@/lib/products";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminUpdateProduct,
  adminUploadImage,
} from "@/lib/admin.functions";
import { safeCall } from "@/lib/server-call";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const listProducts = useServerFn(adminListProducts);
  const createProduct = useServerFn(adminCreateProduct);
  const updateProduct = useServerFn(adminUpdateProduct);
  const deleteProduct = useServerFn(adminDeleteProduct);
  const uploadImage = useServerFn(adminUploadImage);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listProducts(),
  });
  const products = (data?.products ?? []) as unknown as Product[];

  const uploadAll = async (list: File[]) => {
    const urls: string[] = [];
    for (const f of list) {
      const fd = new FormData();
      fd.set("file", f);
      const res = await uploadImage({ data: fd });
      urls.push(res.url);
    }
    return urls;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = (fd.get("name") as string)?.trim();
    const description = (fd.get("description") as string)?.trim();
    const category = (fd.get("category") as string) || "Streetwear";
    const priceMmk = parseFloat(fd.get("price") as string);
    if (!name || !description || isNaN(priceMmk) || priceMmk <= 0) {
      toast.error("Fill all required fields with valid values");
      return;
    }
    setSubmitting(true);
    try {
      const image_urls = await uploadAll(files);
      await createProduct({
        data: {
          name,
          description,
          category,
          price_cents: Math.round((priceMmk / USD_TO_MMK) * 100),
          image_urls,
        },
      });
      toast.success("Product created");
      form.reset();
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setEditFiles([]);
    setEditExistingUrls(productImages_(p));
  };

  const onEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const description = (fd.get("description") as string)?.trim();
    const category = (fd.get("category") as string) || editing.category;
    const priceMmk = parseFloat(fd.get("price") as string);
    const in_stock = fd.get("in_stock") === "on";
    if (!name || !description || isNaN(priceMmk) || priceMmk <= 0) {
      toast.error("Fill all required fields with valid values");
      return;
    }
    setEditSubmitting(true);
    try {
      const uploaded = await uploadAll(editFiles);
      await updateProduct({
        data: {
          id: editing.id,
          name,
          description,
          category,
          in_stock,
          price_cents: Math.round((priceMmk / USD_TO_MMK) * 100),
          image_urls: [...editExistingUrls, ...uploaded],
        },
      });
      toast.success("Product updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
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
            <Field name="price" label="Price (Ks)" type="number" step="100" required />
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
            <span className="label-mono text-forest/60 block mb-2">
              Images {files.length > 0 && `(${files.length} selected)`}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
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
                    {p.category} · {formatPrice(p.price_cents)} {p.in_stock ? "" : "· OUT"}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(p)}
                  className="label-mono px-3 py-1 border-2 border-forest hover:bg-forest hover:text-sand"
                >
                  Edit
                </button>
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

      {editing && (
        <div
          className="fixed inset-0 bg-forest/60 z-50 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={onEditSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-sand border-2 border-forest w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl uppercase tracking-tighter">
                Edit Product
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="label-mono hover:text-safety"
              >
                ✕ Close
              </button>
            </div>
            <Field name="name" label="Name" required defaultValue={editing.name} />
            <div className="grid grid-cols-2 gap-4">
              <Field
                name="price"
                label="Price (Ks)"
                type="number"
                step="100"
                required
                defaultValue={String(Math.round((editing.price_cents / 100) * USD_TO_MMK))}
              />
              <label className="block">
                <span className="label-mono text-forest/60 block mb-2">Category</span>
                <select
                  name="category"
                  defaultValue={editing.category}
                  className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm"
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
                defaultValue={editing.description}
                className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 label-mono">
              <input type="checkbox" name="in_stock" defaultChecked={editing.in_stock} />
              In stock
            </label>

            {editExistingUrls.length > 0 && (
              <div>
                <p className="label-mono text-forest/60 mb-2">Current Images</p>
                <div className="flex flex-wrap gap-2">
                  {editExistingUrls.map((url) => (
                    <div key={url} className="relative w-20 h-20 border-2 border-forest">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditExistingUrls((prev) => prev.filter((u) => u !== url))
                        }
                        className="absolute -top-2 -right-2 bg-safety text-forest w-6 h-6 label-mono border-2 border-forest"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="label-mono text-forest/60 block mb-2">
                Add More Images {editFiles.length > 0 && `(${editFiles.length} selected)`}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setEditFiles(Array.from(e.target.files ?? []))}
                className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm file:mr-3 file:px-3 file:py-1 file:border-0 file:bg-forest file:text-sand file:label-mono"
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 border-2 border-forest px-4 py-3 label-mono hover:bg-forest hover:text-sand"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="btn-forest flex-1 disabled:opacity-60"
              >
                {editSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  step,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono text-forest/60 block mb-2">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm focus:outline-none focus:bg-safety/10"
      />
    </label>
  );
}

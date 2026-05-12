import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { useCart, clearCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/products";
import { placeOrder } from "@/lib/checkout.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — Kush & Cotton" }] }),
});

const FormSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  shipping_name: z.string().trim().min(1, "Required").max(120),
  shipping_address: z.string().trim().min(1, "Required").max(255),
  shipping_city: z.string().trim().min(1, "Required").max(100),
  shipping_zip: z.string().trim().min(1, "Required").max(20),
  shipping_country: z.string().trim().min(2, "Required").max(60),
});

function CheckoutPage() {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();
  const place = useServerFn(placeOrder);
  const [submitting, setSubmitting] = useState(false);

  const shipping = subtotal === 0 ? 0 : subtotal >= 15000 ? 0 : 800;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="px-8 py-32 text-center">
          <p className="label-mono text-forest/60 mb-6">
            Your cart is empty. Add something first.
          </p>
          <Link to="/shop" className="btn-forest">Browse Catalog</Link>
        </div>
      </SiteLayout>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = FormSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSubmitting(true);
    try {
      const res = await place({
        data: {
          ...parsed.data,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        },
      });
      clearCart();
      navigate({ to: "/order/$id", params: { id: res.id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <section className="px-6 md:px-8 py-12 border-b-2 border-forest">
        <p className="label-mono text-safety mb-4">Secure Checkout</p>
        <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tighter leading-none">
          Place Order
        </h1>
      </section>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 border-b-2 border-forest">
        <div className="lg:col-span-2 lg:border-r-2 border-forest p-6 md:p-12 space-y-8">
          <fieldset className="space-y-5">
            <legend className="label-mono text-safety mb-4">Contact</legend>
            <Field name="email" label="Email" type="email" required autoComplete="email" />
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="label-mono text-safety mb-4">Shipping</legend>
            <Field name="shipping_name" label="Full Name" required autoComplete="name" />
            <Field name="shipping_address" label="Address" required autoComplete="street-address" />
            <div className="grid grid-cols-2 gap-4">
              <Field name="shipping_city" label="City" required autoComplete="address-level2" />
              <Field name="shipping_zip" label="ZIP / Postal" required autoComplete="postal-code" />
            </div>
            <Field name="shipping_country" label="Country" required defaultValue="US" autoComplete="country-name" />
          </fieldset>

          <p className="label-mono text-forest/50">
            Demo checkout · No real payment is collected. Your order will trigger
            an instant Telegram dispatch notification.
          </p>
        </div>

        <aside className="p-6 md:p-8 bg-forest text-sand">
          <p className="label-mono text-safety mb-6">Order Summary</p>
          <ul className="space-y-3 mb-6">
            {items.map((i) => (
              <li key={i.product_id} className="flex justify-between text-sm gap-3">
                <span className="truncate">
                  <span className="tabular-nums">{i.quantity}×</span>{" "}
                  <span className="uppercase tracking-wider">{i.name}</span>
                </span>
                <span className="tabular-nums whitespace-nowrap">
                  {formatPrice(i.unit_price_cents * i.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-sand/20 pt-4 space-y-2 mb-6 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Shipping" value={shipping === 0 ? "FREE" : formatPrice(shipping)} />
            <div className="border-t border-sand/20 pt-3 flex justify-between font-display text-xl uppercase">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="block w-full text-center py-5 bg-sand text-forest font-display uppercase tracking-[0.2em] text-xs hover:bg-safety hover:text-sand transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting ? "Processing…" : `Confirm Order · ${formatPrice(total)}`}
          </button>
        </aside>
      </form>
    </SiteLayout>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono text-forest/60 block mb-2">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm focus:outline-none focus:bg-safety/10"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="uppercase tracking-wider text-sand/70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

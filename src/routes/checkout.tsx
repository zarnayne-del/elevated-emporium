import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { useCart, clearCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/products";
import { placeOrder } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import qrKpay from "@/assets/qr-kpay.jpg";
import qrWavepay from "@/assets/qr-wavepay.jpg">


export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — Kush & Cotton" }] }),
});

const ShippingSchema = z.object({
  phone_number: z
    .string()
    .trim()
    .min(5, "Enter a valid phone number")
    .max(32)
    .regex(/^[+\d\s().-]+$/, "Invalid phone number"),
  shipping_name: z.string().trim().min(1, "Required").max(120),
  shipping_address: z.string().trim().min(1, "Required").max(255),
  shipping_city: z.string().trim().min(1, "Required").max(100),
});

type ShippingData = z.infer<typeof ShippingSchema>;

function CheckoutPage() {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();
  const place = useServerFn(placeOrder);
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [shipping, setShipping] = useState<ShippingData | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shippingFee = subtotal === 0 ? 0 : subtotal >= 15000 ? 0 : 800;
  const total = subtotal + shippingFee;

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

  const onShipping = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = ShippingSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setShipping(parsed.data);
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shipping) return;
    if (!file) {
      toast.error("Please upload your payment screenshot");
      return;
    }
    setSubmitting(true);
    try {
      // Upload screenshot
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-screenshots")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from("payment-screenshots")
        .getPublicUrl(path);

      const res = await place({
        data: {
          ...shipping,
          payment_screenshot_url: pub.publicUrl,
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
        <p className="label-mono text-safety mb-4">
          Step {step === "shipping" ? "1" : "2"} of 2 ·{" "}
          {step === "shipping" ? "Shipping Details" : "Payment"}
        </p>
        <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tighter leading-none">
          {step === "shipping" ? "Place Order" : "Pay & Confirm"}
        </h1>
      </section>

      {step === "shipping" ? (
        <form onSubmit={onShipping} className="grid grid-cols-1 lg:grid-cols-3 border-b-2 border-forest">
          <div className="lg:col-span-2 lg:border-r-2 border-forest p-6 md:p-12 space-y-8">
            <fieldset className="space-y-5">
              <legend className="label-mono text-safety mb-4">Contact</legend>
              <Field name="phone_number" label="Phone Number" type="tel" required defaultValue={shipping?.phone_number} autoComplete="tel" />
              <p className="label-mono text-forest/50">We&apos;ll contact you on this number for delivery updates.</p>
            </fieldset>
            <fieldset className="space-y-5">
              <legend className="label-mono text-safety mb-4">Shipping</legend>
              <Field name="shipping_name" label="Full Name" required defaultValue={shipping?.shipping_name} autoComplete="name" />
              <Field name="shipping_address" label="Address" required defaultValue={shipping?.shipping_address} autoComplete="street-address" />
              <Field name="shipping_city" label="City" required defaultValue={shipping?.shipping_city} autoComplete="address-level2" />
            </fieldset>
          </div>
          <Summary items={items} subtotal={subtotal} shippingFee={shippingFee} total={total}>
            <button type="submit" className="block w-full text-center py-5 bg-sand text-forest font-display uppercase tracking-[0.2em] text-xs hover:bg-safety hover:text-sand transition-colors cursor-pointer">
              Continue to Payment →
            </button>
          </Summary>
        </form>
      ) : (
        <form onSubmit={onPayment} className="grid grid-cols-1 lg:grid-cols-3 border-b-2 border-forest">
          <div className="lg:col-span-2 lg:border-r-2 border-forest p-6 md:p-12 space-y-10">
            <div>
              <p className="label-mono text-safety mb-3">Payment Methods</p>
              <h2 className="font-display text-2xl uppercase mb-2">Scan to Pay</h2>
              <p className="text-sm text-forest/70 max-w-md">
                Scan one of the QR codes below with K Pay or Wave Pay. Send the
                exact total of <strong>{formatPrice(total)}</strong>, then upload
                your payment screenshot.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PayCard label="K Pay" img={qrKpay} accent="bg-forest text-sand" />
              <PayCard label="Wave Pay" img={qrWavepay} accent="bg-safety text-sand" />
            </div>

            <div>
              <p className="label-mono text-safety mb-3">Upload Payment Screenshot</p>
              <label className="block border-2 border-dashed border-forest p-8 text-center cursor-pointer hover:bg-forest/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <p className="font-display uppercase text-sm mb-1">{file.name}</p>
                    <p className="label-mono text-forest/60">
                      {(file.size / 1024).toFixed(0)} KB · click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-display uppercase text-base mb-2">
                      Drop receipt or click to attach
                    </p>
                    <p className="label-mono text-forest/60">PNG · JPG · max 5MB</p>
                  </div>
                )}
              </label>
            </div>

            <button
              type="button"
              onClick={() => setStep("shipping")}
              className="label-mono underline-offset-4 hover:text-safety underline"
            >
              ← Back to shipping
            </button>
          </div>
          <Summary items={items} subtotal={subtotal} shippingFee={shippingFee} total={total}>
            <button
              type="submit"
              disabled={submitting}
              className="block w-full text-center py-5 bg-sand text-forest font-display uppercase tracking-[0.2em] text-xs hover:bg-safety hover:text-sand transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {submitting ? "Processing…" : `Confirm · ${formatPrice(total)}`}
            </button>
          </Summary>
        </form>
      )}
    </SiteLayout>
  );
}

function PayCard({ label, img, accent }: { label: string; img: string; accent: string }) {
  return (
    <div className="border-2 border-forest">
      <div className={`${accent} px-4 py-2 flex justify-between items-center label-mono`}>
        <span>{label}</span>
        <span>QR</span>
      </div>
      <div className="bg-sand p-4 flex items-center justify-center aspect-square">
        <img src={img} alt={`${label} QR code`} width={512} height={512} loading="lazy" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

function Summary({
  items,
  subtotal,
  shippingFee,
  total,
  children,
}: {
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  shippingFee: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
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
        <Row label="Shipping" value={shippingFee === 0 ? "FREE" : formatPrice(shippingFee)} />
        <div className="border-t border-sand/20 pt-3 flex justify-between font-display text-xl uppercase">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
      </div>
      {children}
    </aside>
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

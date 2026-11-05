import { brandHead } from "@/lib/brand-head";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/track")({
  component: TrackPage,
  head: () => brandHead("Order Assistance — Walki Talkie", "Private order assistance from Walki Talkie customer service.", "/track"),
});
function TrackPage() {
  return <SiteLayout><section className="px-6 md:px-8 py-16 max-w-3xl">
    <h1 className="font-display text-4xl uppercase mb-6">Order Assistance</h1>
    <p className="mb-8 leading-relaxed">Public phone-number lookups are unavailable to protect customer privacy. Contact customer service for private assistance; identity verification may be required. Do not post payment receipts publicly.</p>
    <a className="btn-forest" href="https://t.me/walkitalkie02" target="_blank" rel="noopener noreferrer">Customer Service</a>
  </section></SiteLayout>;
}

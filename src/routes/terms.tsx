import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { brandHead } from "@/lib/brand-head";

export const Route = createFileRoute("/terms")({
  head: () =>
    brandHead(
      "Terms — Walki Talkie",
      "Current site access, purchasing restrictions and customer assistance information for Walki Talkie.",
      "/terms",
    ),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8">
        <h1 className="font-display text-4xl uppercase">Terms</h1>
        <section className="space-y-3">
          <h2 className="font-display text-xl">Site access</h2>
          <p className="leading-relaxed">
            WALKI TALKIE requires confirmation that you are 18 or older to enter. Staff accounts do
            not receive administrative access automatically. Do not attempt to access other people's
            accounts or private information.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl">Purchasing restrictions</h2>
          <p className="leading-relaxed">
            Purchasing, payment uploads, order-linked giveaway entries and draws are paused.
            Controlled-substance items are not available for purchase through this site. Saved cart
            entries and old order links do not confirm payment, acceptance or dispatch. No shipping
            or delivery promise is made by this page.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl">Existing records and assistance</h2>
          <p className="leading-relaxed">
            Existing records remain available to authorized staff. For private questions about an
            existing order, contact{" "}
            <a
              href="https://t.me/walkitalkie02"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Walki Talkie customer service
            </a>
            . Identity verification may be required. Do not post receipts or personal details
            publicly.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl">About this notice</h2>
          <p className="leading-relaxed">
            This is basic factual information about the current site, not legal advice or a
            certification of compliance. Applicable rules vary by location and may require
            professional review.
          </p>
        </section>
      </article>
    </SiteLayout>
  );
}

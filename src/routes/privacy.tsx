import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { brandHead } from "@/lib/brand-head";

export const Route = createFileRoute("/privacy")({
  head: () =>
    brandHead(
      "Privacy — Walki Talkie",
      "How Walki Talkie handles site visits, staff accounts and private order information.",
      "/privacy",
    ),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8">
        <h1 className="font-display text-4xl uppercase">Privacy</h1>
        <section className="space-y-3">
          <h2 className="font-display text-xl">Stored information</h2>
          <p className="leading-relaxed">
            The site saves your age confirmation and saved cart in your browser. Staff sign-in
            stores session information in browser storage and sends account information to Lovable
            Cloud for authentication. Existing order records may contain names, contact details,
            addresses and payment receipts. These records are restricted to authorized staff; public
            phone-number searches and new payment uploads are unavailable.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl">Visitor analytics</h2>
          <p className="leading-relaxed">
            Lovable records pages visited, where visitors came from, country, browser, operating
            system and device type, time on site, page loading speed and errors. This analytics
            service uses no cookies, stores nothing on your device, does not keep IP addresses and
            does not identify visitors. Page visits, time on page, page speed and errors are
            recorded for every visitor without cookies or identifying anyone. Detailed data is kept
            for 90 days and daily summaries for a year.
          </p>
          <p className="leading-relaxed">
            Lovable collects this data for us.{" "}
            <a
              href="https://lovable.dev/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Lovable's privacy policy
            </a>{" "}
            explains how it handles it.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl">External services</h2>
          <p className="leading-relaxed">
            Fonts are loaded from Google Fonts, so your browser connects to Google to request font
            files. Customer service links open Telegram, where information you choose to send is
            handled by Telegram. Do not share payment receipts publicly. Purchasing and order
            notifications are currently paused.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl">Questions</h2>
          <p className="leading-relaxed">
            Contact{" "}
            <a
              href="https://t.me/walkitalkie02"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Walki Talkie customer service
            </a>{" "}
            with privacy questions or requests about existing information. This notice describes
            current site behavior and is not a claim of legal compliance.
          </p>
        </section>
      </article>
    </SiteLayout>
  );
}

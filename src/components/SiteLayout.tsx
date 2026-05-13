import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-store";
import type { ReactNode } from "react";

export function SiteHeader() {
  const { count } = useCart();
  return (
    <nav className="sticky top-0 z-40 bg-sand/95 backdrop-blur border-b-2 border-forest px-6 md:px-8 py-5 flex justify-between items-center">
      <Link
        to="/"
        className="font-display text-xl md:text-2xl font-bold tracking-tighter uppercase"
      >
        Kush &amp; Cotton
      </Link>
      <div className="hidden md:flex gap-10 uppercase text-[11px] font-semibold tracking-[0.25em]">
        <Link to="/shop" search={{ category: "Flower" }} className="hover:text-safety transition-colors">
          Flower
        </Link>
        <Link to="/shop" search={{ category: "Streetwear" }} className="hover:text-safety transition-colors">
          Streetwear
        </Link>
        <Link to="/shop" search={{ category: "Accessories" }} className="hover:text-safety transition-colors">
          Accessories
        </Link>
        <Link to="/shop" className="hover:text-safety transition-colors">
          Archive
        </Link>
        <Link to="/track" className="hover:text-safety transition-colors">
          Track
        </Link>
      </div>
      <div className="flex items-center gap-5">
        <Link
          to="/cart"
          className="text-[11px] font-semibold uppercase tracking-[0.25em] hover:text-safety transition-colors"
        >
          Cart ({count})
        </Link>
        <span className="hidden md:inline-block label-mono bg-forest text-sand px-2 py-1">
          BOT_ACTIVE
        </span>
      </div>
    </nav>
  );
}

const TELEGRAM_SUPPORT_URL = "https://t.me/walkitalkie02";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-forest px-6 md:px-8 py-6 flex flex-col md:flex-row gap-3 md:gap-0 justify-between items-center text-forest">
      <div className="label-mono">
        © {new Date().getFullYear()} Kush &amp; Cotton / All Rights Reserved
      </div>
      <div className="flex gap-6 label-mono items-center">
        <a href="#" className="hover:text-safety">Privacy</a>
        <a href="#" className="hover:text-safety">Terms</a>
        <a href="#" className="hover:text-safety">Lab Results</a>
        <a
          href={TELEGRAM_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-forest text-sand px-3 py-1 hover:bg-safety transition-colors"
        >
          Customer Service
        </a>
      </div>
    </footer>
  );
}

function FloatingSupport() {
  return (
    <a
      href={TELEGRAM_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact customer service on Telegram"
      className="fixed bottom-5 right-5 z-50 bg-forest text-sand border-2 border-forest hover:bg-safety transition-colors px-4 py-3 flex items-center gap-2 label-mono"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.5 3.5 2.8 10.7c-1 .4-1 1.8 0 2.2l4.7 1.7 1.8 5.7c.3.9 1.4 1.1 2 .4l2.6-2.7 4.7 3.5c.7.5 1.7.1 1.9-.7l3.4-15.5c.2-1-.8-1.8-1.4-1.8zM10 15l-.5 4.2c0 .1.1.1.2 0l2.4-2.4-2.1-1.8z"/>
      </svg>
      Support
    </a>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-sand text-forest">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingSupport />
    </div>
  );
}

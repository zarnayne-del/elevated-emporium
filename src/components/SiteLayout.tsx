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

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-forest px-6 md:px-8 py-6 flex flex-col md:flex-row gap-3 md:gap-0 justify-between items-center text-forest">
      <div className="label-mono">
        © {new Date().getFullYear()} Kush &amp; Cotton / All Rights Reserved
      </div>
      <div className="flex gap-6 label-mono">
        <a href="#" className="hover:text-safety">Privacy</a>
        <a href="#" className="hover:text-safety">Terms</a>
        <a href="#" className="hover:text-safety">Lab Results</a>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-sand text-forest">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

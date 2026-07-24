import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — Walki Talkie" }] }),
});

function AdminLayout() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/admin", label: "Orders", exact: true },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/giveaway", label: "Giveaway" },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-sand text-forest">
      <header className="border-b-2 border-forest px-6 md:px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-xl uppercase tracking-tighter">
            Walki Talkie
          </Link>
          <span className="label-mono bg-forest text-sand px-2 py-1">ADMIN</span>
        </div>
        <Link to="/" className="label-mono hover:text-safety">← Back to site</Link>
      </header>
      <nav className="border-b-2 border-forest px-6 md:px-8 flex gap-2">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-5 py-3 font-display uppercase text-[11px] tracking-[0.2em] border-b-2 -mb-[2px] ${
                active ? "border-safety text-safety" : "border-transparent hover:text-safety"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}

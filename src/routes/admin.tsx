import { brandHead } from "@/lib/brand-head";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
  head: () => brandHead("Admin — Walki Talkie", "Walki Talkie staff management area.", "/admin"),
});

function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(getAdminStatus);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "access"],
    retry: false,
    queryFn: async () => {
      // No session at all → don't call the protected function (it would
      // reject with a raw 401 Response and blank the page).
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return { isAdmin: false };
      try {
        return await checkAdmin();
      } catch {
        return { isAdmin: false };
      }
    },
  });

  const tabs = [
    { to: "/admin", label: "Orders", exact: true },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/giveaway", label: "Giveaway" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sand text-forest flex items-center justify-center">
        <p className="label-mono text-forest/60">Checking access…</p>
      </div>
    );
  }

  if (isError || !data?.isAdmin) {
    return (
      <div className="min-h-screen bg-sand text-forest flex items-center justify-center p-6">
        <div className="border-2 border-forest p-10 text-center max-w-md space-y-4">
          <p className="label-mono text-safety">Restricted</p>
          <h1 className="font-display text-3xl uppercase tracking-tighter">Staff access only</h1>
          <p className="label-mono text-forest/60">
            Sign in with an approved staff account to manage the store.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/auth" className="btn-forest">Sign In</Link>
            <Link to="/" className="label-mono self-center hover:text-safety">← Back to site</Link>
          </div>
        </div>
      </div>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-sand text-forest">
      <header className="border-b-2 border-forest px-6 md:px-8 py-5 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-xl uppercase tracking-tighter">
            WALKI TALKIE
          </Link>
          <span className="label-mono bg-forest text-sand px-2 py-1">ADMIN</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={signOut} className="label-mono hover:text-safety">Sign out</button>
          <Link to="/" className="label-mono hover:text-safety">← Back to site</Link>
        </div>
      </header>
      <nav aria-label="Staff navigation" className="border-b-2 border-forest px-3 md:px-8 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
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

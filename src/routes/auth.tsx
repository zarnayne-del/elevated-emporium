import { brandHead } from "@/lib/brand-head";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => brandHead("Staff Sign In — Walki Talkie", "Sign in to the Walki Talkie staff area to manage orders, products and the monthly giveaway.", "/auth"),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created. Ask the owner to grant you admin access.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-sand text-forest flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md border-2 border-forest p-8 space-y-5">
        <div>
          <p className="label-mono text-safety mb-2">Staff Area</p>
          <h1 className="font-display text-3xl uppercase tracking-tighter">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h1>
        </div>
        <label className="block">
          <span className="label-mono text-forest/60 block mb-2">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="label-mono text-forest/60 block mb-2">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-sand border-2 border-forest px-4 py-3 text-sm"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-forest w-full disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="label-mono w-full text-forest/60 hover:text-safety"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}

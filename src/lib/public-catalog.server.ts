import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicCatalogClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Catalog unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: Object.assign(
        (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers, signal: AbortSignal.timeout(15_000) });
        },
        { preconnect: fetch.preconnect },
      ),
    },
  });
}

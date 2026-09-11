import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin image proxy.
 *
 * The Supabase storage host has no AAAA record, so IPv6-only / NAT64 mobile
 * networks cannot fetch product images directly. This route serves those same
 * objects from the app's own domain (which is dual-stack) over the server's
 * reliable IPv4 upstream.
 *
 * URL shape: /api/public/img/<bucket>/<object path>
 */
// Public catalog imagery only. Payment receipts live in a private bucket and
// are never served through this unauthenticated proxy.
const ALLOWED_BUCKETS = new Set(["product-images", "giveaway-prizes"]);

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const [bucket, ...rest] = splat.split("/");
        const objectPath = rest.join("/");

        if (!bucket || !objectPath || !ALLOWED_BUCKETS.has(bucket)) {
          return new Response("Not found", { status: 404 });
        }

        const base = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
        if (!base) return new Response("Storage not configured", { status: 500 });

        const upstream = `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;

        try {
          const res = await fetch(upstream);
          if (!res.ok || !res.body) {
            return new Response("Image not found", { status: res.status === 404 ? 404 : 502 });
          }
          return new Response(res.body, {
            status: 200,
            headers: {
              "content-type": res.headers.get("content-type") ?? "image/jpeg",
              "cache-control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response("Upstream image fetch failed", { status: 502 });
        }
      },
    },
  },
});

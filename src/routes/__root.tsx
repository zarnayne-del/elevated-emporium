import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AgeGate } from "@/components/AgeGate";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="max-w-md text-center">
        <p className="label-mono text-safety mb-4">Error 404</p>
        <h1 className="font-display text-7xl uppercase tracking-tighter text-forest">
          Off-Grid
        </h1>
        <p className="mt-4 text-sm text-forest/70">
          The page you're looking for doesn't exist or has been archived.
        </p>
        <div className="mt-8">
          <Link to="/" className="btn-forest">Return Home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="max-w-md text-center">
        <p className="label-mono text-safety mb-4">System Error</p>
        <h1 className="font-display text-3xl uppercase tracking-tighter text-forest">
          This page didn't load
        </h1>
        <p className="mt-4 text-sm text-forest/70">
          Something went wrong on our end. Try again or head home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-forest"
          >
            Try again
          </button>
          <a href="/" className="btn-outline">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kush & Cotton — Premium Cannabis & Streetwear" },
      {
        name: "description",
        content:
          "A symbiotic fusion of premium cultivars and architectural silhouettes. Curated cannabis goods and streetwear for the deliberate enthusiast.",
      },
      { property: "og:title", content: "Kush & Cotton — Premium Cannabis & Streetwear" },
      {
        property: "og:description",
        content:
          "Premium cannabis goods and streetwear. Slow grown. Deliberately woven.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-sand text-forest">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <AgeGate />
      <Toaster />
    </QueryClientProvider>
  );
}

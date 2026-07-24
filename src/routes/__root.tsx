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
      { title: "Walki Talkie — Premium Cannabis & Streetwear" },
      {
        name: "description",
        content:
          "A symbiotic fusion of premium cultivars and architectural silhouettes. Curated cannabis goods and streetwear for the deliberate enthusiast.",
      },
      { property: "og:title", content: "Walki Talkie — Premium Cannabis & Streetwear" },
      {
        property: "og:description",
        content:
          "Premium cannabis goods and streetwear. Slow grown. Deliberately woven.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Walki Talkie — Premium Cannabis & Streetwear" },
      { name: "description", content: "E-commerce platform for cannabis and streetwear, featuring a modern UI and secure checkout." },
      { property: "og:description", content: "E-commerce platform for cannabis and streetwear, featuring a modern UI and secure checkout." },
      { name: "twitter:description", content: "E-commerce platform for cannabis and streetwear, featuring a modern UI and secure checkout." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/50507db2-50ea-42af-a0b5-5599b01defde/id-preview-4a3f52aa--e5b7778b-39b3-473b-89c2-5e00b2fb4978.lovable.app-1778633790828.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/50507db2-50ea-42af-a0b5-5599b01defde/id-preview-4a3f52aa--e5b7778b-39b3-473b-89c2-5e00b2fb4978.lovable.app-1778633790828.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;700&display=swap",
      },
    ],
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

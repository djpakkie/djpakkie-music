import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { AppQueryProvider } from "@/lib/query-client";
import { PlayerProvider } from "@/lib/player-context";
import { SiteHeader } from "@/components/site-header";
import { SearchBar } from "@/components/search-bar";
import { NowPlayingBar } from "@/components/now-playing-bar";
import { NowPlayingPreview } from "@/components/now-playing-preview";
import { RetroBackground } from "@/components/retro-background";
import { RetroProvider } from "@/lib/retro-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DJ Pakkie" },
      { name: "description", content: "A personal streaming library. Press play." },
      { property: "og:title", content: "DJ Pakkie" },
      { property: "og:description", content: "A personal streaming library. Press play." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "DJ Pakkie" },
      { name: "twitter:description", content: "A personal streaming library. Press play." },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd82c0e1-5e15-47f8-8b5a-cf569e41e03b/id-preview-42f291f9--f4dbf892-6971-4ef5-aa65-d313780a0a27.lovable.app-1777051642785.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd82c0e1-5e15-47f8-8b5a-cf569e41e03b/id-preview-42f291f9--f4dbf892-6971-4ef5-aa65-d313780a0a27.lovable.app-1777051642785.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <PlayerProvider>
          <RetroProvider>
            <RetroBackground />
            <div className="relative flex min-h-screen flex-col pb-24">
              <SiteHeader />
              <SearchBar />
              <main className="flex-1">
                <Outlet />
              </main>
              <NowPlayingBar />
              <NowPlayingPreview />
              <Toaster />
            </div>
          </RetroProvider>
        </PlayerProvider>
      </AuthProvider>
    </AppQueryProvider>
  );
}

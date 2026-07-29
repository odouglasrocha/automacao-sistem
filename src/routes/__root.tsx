import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SideNav } from "@/components/hud/SideNav";
import { TopBar } from "@/components/hud/TopBar";
import { AuthProvider, useAuth } from "@/context/AuthProvider";

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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
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
      { title: "ICS · Sistema de Controle Industrial" },
      {
        name: "description",
        content:
          "Plataforma industrial modular (MES + SCADA + IIoT + IA) para monitoramento e controle de plantas em tempo real.",
      },
      { name: "author", content: "ICS Platform" },
      { property: "og:title", content: "ICS · Sistema de Controle Industrial" },
      {
        property: "og:description",
        content: "MES, SCADA, IIoT, OEE, Andon e IA para chão de fábrica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
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
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <div className="min-h-screen flex flex-col">
            <TopBar />
            <div className="flex flex-1 min-h-0">
              <SideNav />
              <main className="flex-1 min-w-0 overflow-x-hidden">
                <Outlet />
              </main>
            </div>
          </div>
        </AuthGate>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const isAuthRoute = pathname === "/auth";

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      nav({ to: "/auth", replace: true });
    }
  }, [loading, user, isAuthRoute, nav]);

  if (isAuthRoute) return <Outlet />;
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Carregando sessão…
      </div>
    );
  }
  return <>{children}</>;
}

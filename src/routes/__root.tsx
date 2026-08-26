import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";

import appCss from "../styles.css?url";

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
      { name: "theme-color", content: "#0b0b2a" },
      { title: "Prolance — Real-time LLM trained bots for high-class proposal generation" },
      {
        name: "description",
        content:
          "Real-time LLM trained bots for high-class proposal generation. Write. Win. Grow.",
      },
      { property: "og:title", content: "Prolance — Real-time LLM trained bots for high-class proposal generation" },
      {
        property: "og:description",
        content:
          "Real-time LLM trained bots for high-class proposal generation. Write. Win. Grow.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://prolanceproposal.com/" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2a60gYo3xBU6CY3UPqvoLdH0P282/social-images/social-1784147955648-WhatsApp_Image_2026-07-16_at_01.02.14.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Prolance — Real-time LLM trained bots for high-class proposal generation" },
      { name: "twitter:description", content: "Real-time LLM trained bots for high-class proposal generation. Write. Win. Grow." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2a60gYo3xBU6CY3UPqvoLdH0P282/social-images/social-1784147955648-WhatsApp_Image_2026-07-16_at_01.02.14.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
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
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Outlet />
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

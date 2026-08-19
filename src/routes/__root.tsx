import { type ReactNode, useEffect, useState } from "react";
import { hasClientJwt } from "@/lib/route-auth";
import { client } from "@/lib/appwrite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
Outlet,
Link,
createRootRouteWithContext,
useRouter,
useLocation,
HeadContent,
Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import astryxCss from "../styles/astryx.css?url";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/context/ProjectContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DevCycleProvider } from "@/context/DevCycleContext";

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
{ title: "AI-DRAKON | Visual Programming" },
{ name: "description", content: "Create, analyze, and generate executable DRAKON diagrams with AI." },
{ name: "author", content: "AI-DRAKON" },
{ property: "og:title", content: "AI-DRAKON | Visual Programming" },
{ property: "og:description", content: "Create, analyze, and generate executable DRAKON diagrams with AI." },
{ property: "og:type", content: "website" },
{ name: "twitter:card", content: "summary" },
{ name: "twitter:site", content: "@aidrakon" },
{ name: "twitter:title", content: "AI-DRAKON | Visual Programming" },
{ name: "twitter:description", content: "Create, analyze, and generate executable DRAKON diagrams with AI." },
],
links: [
{
rel: "stylesheet",
href: appCss,
},
{
rel: "stylesheet",
href: astryxCss,
},
],
}),
shellComponent: RootShell,
component: RootComponent,
notFoundComponent: NotFoundComponent,
errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
return (
<html lang="en" className="dark" data-theme="dark" data-astryx-theme="dark" suppressHydrationWarning>
<head>
<script
dangerouslySetInnerHTML={{
__html: `(function(){try{var raw=localStorage.getItem("drakon.settings");var theme="system";if(raw){var parsed=JSON.parse(raw);if(parsed&&parsed.app&&parsed.app.theme){theme=parsed.app.theme;}}var isDark=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;if(isDark){root.classList.add("dark");root.setAttribute("data-theme","dark");root.setAttribute("data-astryx-theme","dark");}else{root.classList.remove("dark");root.setAttribute("data-theme","light");root.setAttribute("data-astryx-theme","astryx");}}catch(e){}})();`,
}}
/>
<HeadContent />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
rel="stylesheet"
href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
/>
<link
rel="stylesheet"
href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200"
/>
</head>
<body>
{children}
<Scripts />
</body>
</html>
);
}

import { AuthProvider } from "@/context/AuthContext";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => { client.ping(); }, []);


  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const isPublicLanding = hydrated && location.pathname === "/" && !hasClientJwt();
  const hideChrome =
    location.pathname === "/login" || location.pathname.startsWith("/pipeline/") || isPublicLanding;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProjectProvider>
            <TooltipProvider delayDuration={200}>
              {hideChrome ? (
                <div className="astryx-migrated min-h-screen bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]">
                  <Outlet />
                </div>
              ) : (
                <DevCycleProvider>
                  <WorkspaceShell>
                    <Outlet />
                  </WorkspaceShell>
                </DevCycleProvider>
              )}
              <Toaster position="top-center" richColors closeButton />
            </TooltipProvider>
          </ProjectProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}


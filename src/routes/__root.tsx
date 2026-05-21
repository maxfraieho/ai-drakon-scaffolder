import { useEffect } from "react";
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
import { readSettings } from "@/lib/settings-storage";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/context/ProjectContext";

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
className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm
font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm
font-medium text-primary-foreground transition-colors hover:bg-primary/90"
>
Try again
</button>
<a
href="/"
className="inline-flex items-center justify-center rounded-md border border-input
bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors
hover:bg-accent"
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
{ title: "Lovable App" },
{ name: "description", content: "Setup Assistant prepares a new project environment for
AI-DRAKON Platform before code import." },
{ name: "author", content: "Lovable" },
{ property: "og:title", content: "Lovable App" },
{ property: "og:description", content: "Setup Assistant prepares a new project environment for
AI-DRAKON Platform before code import." },
{ property: "og:type", content: "website" },
{ name: "twitter:card", content: "summary" },
{ name: "twitter:site", content: "@Lovable" },
{ name: "twitter:title", content: "Lovable App" },
{ name: "twitter:description", content: "Setup Assistant prepares a new project environment for
AI-DRAKON Platform before code import." },
{ property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Y0m
MTETKm7PDCgD38d3l1I6YPNb2/social-images/social-1778404176364-12767.webp" },
{ name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Y0m
MTETKm7PDCgD38d3l1I6YPNb2/social-images/social-1778404176364-12767.webp" },
],
links: [
{
rel: "stylesheet",
href: appCss,
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
<html lang="en" className="dark">
<head>
<HeadContent />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
rel="stylesheet"
href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&famil
y=JetBrains+Mono:wght@400;500;600&display=swap"
/>
<link
rel="stylesheet"
href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GR
AD@20..48,300..700,0..1,-50..200"
/>
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

useEffect(() => {
try {
const theme = readSettings().app.theme ?? "dark";
const resolved = theme === "light" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", resolved);
document.documentElement.classList.toggle("dark", resolved === "dark");
} catch {
// ignore
}
}, []);

const location = useLocation();
const hideChrome =
location.pathname === "/login" || location.pathname.startsWith("/pipeline/");

return (
<QueryClientProvider client={queryClient}>
<ProjectProvider>
<TooltipProvider delayDuration={200}>
{hideChrome ? (
<div className="min-h-screen bg-[var(--bg-base)]">
<Outlet />
</div>
):(
<WorkspaceShell>
<Outlet />
</WorkspaceShell>
)}
<Toaster position="top-center" richColors closeButton />
</TooltipProvider>
</ProjectProvider>
</QueryClientProvider>
);
}


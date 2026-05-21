import { NavLink, Outlet } from "react-router-dom";

import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";

const navItems = [
{ to: "/overview", label: "Overview" },
{ to: "/proxies", label: "Proxies" },
{ to: "/providers", label: "Providers" },
{ to: "/models", label: "Models" },
{ to: "/credentials", label: "Credentials" },
{ to: "/observability", label: "Observability" },
{ to: "/routing", label: "Routing" },
{ to: "/settings", label: "Settings" },
] as const;

export function AppLayout() {
return (
<div className="min-h-screen bg-background text-foreground">
<header className="border-b border-border bg-card">
<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
<div className="text-sm font-semibold">AegisRoute Operator UI</div>
<LanguageSwitcher />
</div>
</header>

<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4
md:grid-cols-[220px_1fr]">
<aside className="rounded-md border border-border bg-card p-2">
<nav className="flex flex-col gap-1">
{navItems.map((item) => (
<NavLink
key={item.to}
to={item.to}
className={({ isActive }) =>
[
"rounded-sm px-3 py-2 text-sm transition-colors",
isActive
? "bg-primary text-primary-foreground"
: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
].join(" ")
}
>
{item.label}
</NavLink>
))}
</nav>
</aside>

<main className="rounded-md border border-border bg-card p-4 md:p-6">
<Outlet />
</main>
</div>
</div>
);
}


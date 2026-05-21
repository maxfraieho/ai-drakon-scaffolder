import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
Bot,
Cog,
Cpu,
FileText,
GitBranch,
GitCompare,
LayoutDashboard,
LogOut,
Menu,
Moon,
Sun,
Terminal,
} from "lucide-react";

import {
Sheet,
SheetContent,
SheetHeader,
SheetTitle,
SheetTrigger,
} from "@/components/ui/sheet";
import {
Tooltip,
TooltipContent,
TooltipTrigger,
} from "@/components/ui/tooltip";
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { DevCyclePanel } from "@/components/workspace/DevCyclePanel";
import { ProjectSelector } from "@/components/workspace/ProjectSelector";
import { cn } from "@/lib/utils";
import { clearAccessToken } from "@/lib/auth";
import { readSettings, writeSettings } from "@/lib/settings-storage";

type RailItem = {
to: "/diagrams" | "/docs" | "/sync" | "/github" | "/settings" | "/agents";
label: string;
icon: React.ComponentType<{ className?: string }>;
};

const RAIL_TOP: RailItem[] = [
{ to: "/diagrams", label: "Схеми", icon: LayoutDashboard },
{ to: "/docs", label: "Нотатки", icon: FileText },
{ to: "/sync", label: "Sync", icon: GitCompare },
{ to: "/github", label: "GitHub", icon: GitBranch },
{ to: "/agents", label: "Агенти", icon: Cpu },
];

const RAIL_BOTTOM: RailItem[] = [
{ to: "/settings", label: "Налаштування", icon: Cog },
];

function applyTheme(theme: "light" | "dark") {
document.documentElement.setAttribute("data-theme", theme);
document.documentElement.classList.toggle("dark", theme === "dark");
}
function getBreadcrumb(pathname: string): {
section: string;
sectionPath: string;
sub?: string;
}{
if (pathname.startsWith("/diagram/editor"))
return { section: "Diagrams", sectionPath: "/diagrams", sub: "Editor" };
if (pathname.startsWith("/diagrams"))
return { section: "Diagrams", sectionPath: "/diagrams" };
if (pathname.startsWith("/docs"))
return { section: "Нотатки", sectionPath: "/docs" };
if (pathname.startsWith("/sync"))
return { section: "Sync", sectionPath: "/sync" };
if (pathname.startsWith("/github"))
return { section: "GitHub", sectionPath: "/github" };
if (pathname.startsWith("/settings"))
return { section: "Settings", sectionPath: "/settings" };
if (pathname.startsWith("/agents"))
return { section: "Агенти", sectionPath: "/agents" };
return { section: "Workspace", sectionPath: "/" };
}

interface WorkspaceShellProps {
children: ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
const location = useLocation();
const navigate = useNavigate();
const [agentsOpen, setAgentsOpen] = useState(false);
const [mobileNavOpen, setMobileNavOpen] = useState(false);
const [theme, setTheme] = useState<"light" | "dark">("dark");
const [cmdOpen, setCmdOpen] = useState(false);

useEffect(() => {
const t = readSettings().app.theme;
setTheme(t === "light" ? "light" : "dark");
}, []);

useEffect(() => {
const down = (e: KeyboardEvent) => {
if ((e.metaKey || e.ctrlKey) && e.key === "k") {
e.preventDefault();
setCmdOpen((v) => !v);
}
};
document.addEventListener("keydown", down);
return () => document.removeEventListener("keydown", down);
}, []);

const toggleTheme = () => {
const next = theme === "dark" ? "light" : "dark";
setTheme(next);
const s = readSettings();
writeSettings({ ...s, app: { ...s.app, theme: next } });
applyTheme(next);
};

const logout = () => {
clearAccessToken();
navigate({ to: "/login", replace: true });
};

const isRailActive = (to: string) =>
location.pathname === to || location.pathname.startsWith(to + "/");

const crumb = getBreadcrumb(location.pathname);

return (
<div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-base)]
text-[var(--text-primary)]">
{/ TOP BAR — 32px /}
<header className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)]
bg-[var(--bg-surface)] px-3">
<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
<SheetTrigger asChild>
<button
type="button"
className="md:hidden inline-flex h-6 w-6 items-center justify-center rounded
text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
aria-label="Меню"
>
<Menu className="h-4 w-4" />
</button>
</SheetTrigger>
<SheetContent side="left" className="w-64 border-r border-[var(--border-subtle)]
bg-[var(--bg-surface)] p-0">
<SheetHeader className="border-b border-[var(--border-subtle)] px-3 py-2">
<SheetTitle className="font-mono text-[10px] uppercase tracking-[0.18em]
text-[var(--text-muted)]">
Навігація
</SheetTitle>
</SheetHeader>
<nav className="p-2 flex flex-col gap-0.5">
{[...RAIL_TOP, ...RAIL_BOTTOM].map((item) => {
const Icon = item.icon;
const active = isRailActive(item.to);
return (
<Link
key={item.to}
to={item.to}
onClick={() => setMobileNavOpen(false)}
className={cn(
"flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 font-mono text-[12px]
transition-colors",
active
? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
: "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
)}
>
<Icon className="h-4 w-4" />
{item.label}
</Link>
);
})}
</nav>
</SheetContent>
</Sheet>

<Link
to="/diagrams"
className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase
tracking-[0.12em] text-[var(--text-primary)]"
>
<Terminal
aria-hidden="true"
className="h-3.5 w-3.5 text-[var(--accent-amber)]"
/>
AI-DRAKON
</Link>

<span aria-hidden="true" className="hidden md:block h-3 w-px bg-[var(--border-subtle)]
mx-1" />

<div className="hidden md:flex items-center gap-1.5 font-mono text-[11px]
text-[var(--text-muted)] min-w-0">
<Link
to={crumb.sectionPath}
className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors
duration-150"
>
{crumb.section}
</Link>
{crumb.sub ? (
<>
<span>/</span>
<span className="truncate">{crumb.sub}</span>
</>
) : null}
</div>

<button
type="button"
onClick={() => setCmdOpen(true)}
className="hidden md:inline-flex items-center gap-1.5 h-5 px-2 rounded border
border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5
hover:text-[var(--text-primary)] transition-colors ml-2"
aria-label="Відкрити command palette"
>
<span>⌘K</span>
</button>

<div className="ml-auto flex items-center gap-0.5">
<Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
<Tooltip delayDuration={300}>
<TooltipTrigger asChild>
<SheetTrigger asChild>
<button
type="button"
aria-label="Чат з агентом"
className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)]
hover:bg-white/5 hover:text-[var(--text-primary)]"
>
<Bot className="h-4 w-4" />
</button>
</SheetTrigger>
</TooltipTrigger>
<TooltipContent side="bottom" className="font-mono text-[11px]">
Чат з агентом
</TooltipContent>
</Tooltip>
<SheetContent
side="right"
className="w-full p-0 sm:max-w-[480px] sm:w-[480px] bg-[var(--bg-surface)] border-l
border-[var(--border-subtle)]"
>
<SheetHeader className="border-b border-[var(--border-subtle)] px-4 py-3">
<SheetTitle className="font-mono text-[10px] uppercase tracking-[0.18em]
text-[var(--text-muted)]">
AI-агенти
</SheetTitle>
</SheetHeader>
<div className="h-[calc(100%-3.25rem)]">
<AgentChatPanel className="h-full" />
</div>
</SheetContent>
</Sheet>

<Tooltip delayDuration={300}>
<TooltipTrigger asChild>
<button
type="button"
onClick={toggleTheme}
aria-label={theme === "dark" ? "Світла тема" : "Темна тема"}
className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)]
hover:bg-white/5 hover:text-[var(--text-primary)]"
>
{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</button>
</TooltipTrigger>
<TooltipContent side="bottom" className="font-mono text-[11px]">
{theme === "dark" ? "Світла тема" : "Темна тема"}
</TooltipContent>
</Tooltip>

<AlertDialog>
<Tooltip delayDuration={300}>
<TooltipTrigger asChild>
<AlertDialogTrigger asChild>
<button
type="button"
aria-label="Вийти"
className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)]
hover:bg-white/5 hover:text-[var(--text-primary)] active:scale-[0.96] transition-transform
duration-75"
>
<LogOut className="h-4 w-4" />
</button>
</AlertDialogTrigger>
</TooltipTrigger>
<TooltipContent side="bottom" className="font-mono text-[11px]">
Вийти
</TooltipContent>
</Tooltip>
<AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)]
font-mono">
<AlertDialogHeader>
<AlertDialogTitle className="text-[var(--text-primary)] font-mono text-[13px] font-semibold
uppercase tracking-wider">
Вийти з системи?
</AlertDialogTitle>
<AlertDialogDescription className="text-[var(--text-muted)] text-[12px]">
JWT-токен буде видалено. Потрібно буде увійти знову.
</AlertDialogDescription>
</AlertDialogHeader>
<AlertDialogFooter>
<AlertDialogCancel className="font-mono text-[11px] uppercase tracking-wider bg-transparent
border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5">
Скасувати
</AlertDialogCancel>
<AlertDialogAction
onClick={logout}
className="font-mono text-[11px] uppercase tracking-wider
bg-[var(--color-primary-container,#f59e0b)] text-[#2a1700] hover:brightness-110"
>
Вийти
</AlertDialogAction>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
</div>
</header>

{/ WORKSPACE BODY /}
<div className="flex flex-1 min-h-0 overflow-hidden">
<aside className="hidden md:flex h-full w-60 shrink-0 flex-col border-r
border-[var(--border-subtle)] bg-[var(--bg-surface)]">
<div className="border-b border-[var(--border-subtle)]">
<ProjectSelector />
</div>

<nav aria-label="Основна навігація" className="flex-1 overflow-y-auto p-2">
<div className="flex flex-col gap-0.5">
{[...RAIL_TOP, ...RAIL_BOTTOM].map((item) => {
const Icon = item.icon;
const active = isRailActive(item.to);
return (
<Link
key={item.to}
to={item.to}
className={cn(
"flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 font-mono text-[11px]
transition-colors",
active
? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
: "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
)}
>
<Icon className="h-3.5 w-3.5" />
{item.label}
</Link>
);
})}
</div>
</nav>

<DevCyclePanel />
</aside>

{/ CONTENT SLOT /}
<main className="flex-1 min-w-0 overflow-hidden">
{children}
</main>
</div>

<CommandPalette
open={cmdOpen}
onOpenChange={setCmdOpen}
theme={theme}
onToggleTheme={toggleTheme}
onLogout={logout}
/>
</div>
);
}


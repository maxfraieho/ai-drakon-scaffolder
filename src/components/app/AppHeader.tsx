import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Github,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Settings as SettingsIcon,
  Sun,
  FileCode,
  ChevronDown,
  Sliders,
  Brain,
  BookOpen,
  Terminal,
  Activity,
  Wand2,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
Sheet,
SheetContent,
SheetHeader,
SheetTitle,
SheetTrigger,
} from "@/components/ui/sheet";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { clearAccessToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

type NavItem = {
  to: "/diagrams" | "/workspace" | "/settings" | "/gallery";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { to: "/diagrams", label: "Схеми", icon: LayoutGrid },
  { to: "/gallery", label: "Спільнота", icon: Globe },
  { to: "/workspace", label: "Код & Знання", icon: FileCode },
  { to: "/settings", label: "Налаштування", icon: SettingsIcon },
];


export function AppHeader() {
const location = useLocation();
const navigate = useNavigate();
const { logout: appwriteLogout } = useAuth();
const [mobileOpen, setMobileOpen] = useState(false);
const [agentsOpen, setAgentsOpen] = useState(false);
const { theme, setTheme } = useTheme();

const toggleTheme = () => {
setTheme(theme === "dark" ? "light" : "dark");
};

const logout = async () => {
try {
await appwriteLogout();
} catch (e) {
console.error("Appwrite logout failed:", e);
}
clearAccessToken();
navigate({ to: "/login", replace: true });
};

const isActive = (path: string) =>
location.pathname === path || location.pathname.startsWith(path + "/");

return (
<header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-surface)]/80">
<div className="mx-auto flex h-12 w-full max-w-[1600px] items-center gap-2 px-3 md:px-4">
{/* Mobile menu */}
<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
<SheetTrigger asChild>
<Button
variant="ghost"
size="icon"
className="md:hidden h-9 w-9 text-[var(--text-secondary)]"
aria-label="Меню"
>
<Menu className="h-5 w-5" />
</Button>
</SheetTrigger>
<SheetContent
side="left"
className="w-72 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0"
>
<SheetHeader className="border-b border-[var(--border-subtle)] px-4 py-3">
<SheetTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
AI-DRAKON
</SheetTitle>
</SheetHeader>
<nav className="p-2">
<ul className="space-y-0.5">
{NAV.map((item) => {
const Icon = item.icon;
const active = isActive(item.to);
return (
<li key={item.to}>
<Link
to={item.to}
onClick={() => setMobileOpen(false)}
className={cn(
"flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition-colors",
active
? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-l-2 border-[var(--accent-amber)]"
: "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
)}
>
<Icon className="h-4 w-4" />
{item.label}
</Link>
</li>
);
})}
</ul>
<div className="my-2 border-t border-[var(--border-subtle)]" />
<button
type="button"
onClick={() => {
toggleTheme();
}}
className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
>
{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
{theme === "dark" ? "Світла тема" : "Темна тема"}
</button>
<button
type="button"
onClick={() => {
setMobileOpen(false);
logout();
}}
className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--color-error)]"
>
<LogOut className="h-4 w-4" />
Вийти
</button>
</nav>
</SheetContent>
</Sheet>

{/* Brand */}
<Link
to="/diagrams"
className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-primary)]"
>
<span
aria-hidden="true"
className="inline-block h-2 w-2 rounded-full bg-[var(--accent-amber)] shadow-[0_0_8px_var(--accent-amber)]"
/>
AI-DRAKON
</Link>

{/* Desktop nav */}
<nav className="ml-4 hidden md:flex items-center gap-0.5">
{NAV.map((item) => {
const Icon = item.icon;
const active = isActive(item.to);
return (
<Link
key={item.to}
to={item.to}
className={cn(
"inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors",
active
? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
: "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
)}
>
<Icon className="h-4 w-4" />
{item.label}
</Link>
);
})}

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] ml-1 border border-white/5 bg-white/5"
    >
      <span>Інструменти</span>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-80 p-2 bg-[var(--astryx-surface-elevated)] border-white/10 shadow-2xl">
    <div className="grid grid-cols-2 gap-1.5">
      <Link
        to="/codegen"
        className="flex flex-col gap-1 rounded-md p-2 hover:bg-white/5 transition-all text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
          <Wand2 className="h-3.5 w-3.5 text-amber-500" />
          Кодогенерація
        </span>
        <span className="text-[10px] text-zinc-400 leading-tight">
          Генерація ДРАКОН-коду з опису ШІ.
        </span>
      </Link>
      <Link
        to="/knowledge"
        className="flex flex-col gap-1 rounded-md p-2 hover:bg-white/5 transition-all text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
          <Brain className="h-3.5 w-3.5 text-teal-400" />
          Бази знань
        </span>
        <span className="text-[10px] text-zinc-400 leading-tight">
          Зони знань Garden Bloom.
        </span>
      </Link>
      <Link
        to="/notebooks"
        className="flex flex-col gap-1 rounded-md p-2 hover:bg-white/5 transition-all text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
          <BookOpen className="h-3.5 w-3.5 text-blue-400" />
          NotebookLM
        </span>
        <span className="text-[10px] text-zinc-400 leading-tight">
          Archivist AI чат з джерелами.
        </span>
      </Link>
      <Link
        to="/devcycle"
        className="flex flex-col gap-1 rounded-md p-2 hover:bg-white/5 transition-all text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          DevCycle
        </span>
        <span className="text-[10px] text-zinc-400 leading-tight">
          Панель виконання завдань розробки.
        </span>
      </Link>

      <Link
        to="/pipelines"
        className="flex flex-col gap-1 rounded-md p-2 hover:bg-white/5 transition-all text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
          <Sliders className="h-3.5 w-3.5 text-rose-400" />
          Пайплайни
        </span>
        <span className="text-[10px] text-zinc-400 leading-tight">
          Редактор граф-пайплайнів.
        </span>
      </Link>
    </div>
  </DropdownMenuContent>
</DropdownMenu>
</nav>

<div className="ml-auto flex items-center gap-1">
<Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
<SheetTrigger asChild>
<Button
variant="ghost"
size="sm"
className="h-9 gap-1.5 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
aria-label="Агенти"
title="AI-агенти"
>
<Bot className="h-4 w-4" />
<span className="hidden sm:inline text-sm">Агенти</span>
</Button>
</SheetTrigger>
<SheetContent
side="right"
className="w-full p-0 sm:max-w-[480px] sm:w-[480px]"
>
<SheetHeader className="border-b px-4 py-3">
<SheetTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
AI-агенти
</SheetTitle>
</SheetHeader>
<div className="h-[calc(100%-3.25rem)]">
<AgentChatPanel className="h-full" />
</div>
</SheetContent>
</Sheet>

<button
type="button"
onClick={toggleTheme}
aria-label={theme === "dark" ? "Світла тема" : "Темна тема"}
title={theme === "dark" ? "Світла тема" : "Темна тема"}
className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
>
{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</button>

<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button
variant="ghost"
size="icon"
className="hidden md:inline-flex h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
aria-label="Акаунт"
title="Акаунт"
>
<LogOut className="h-4 w-4" />
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-44">
<DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
<SettingsIcon className="mr-2 h-4 w-4" />
Налаштування
</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem
onClick={logout}
className="text-[var(--color-error)] focus:text-[var(--color-error)]"
>
<LogOut className="mr-2 h-4 w-4" />
Вийти
</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</div>
</div>
</header>
);
}


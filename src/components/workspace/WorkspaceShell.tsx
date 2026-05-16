import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Cog,
  FileText,
  GitBranch,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Terminal,
  Workflow,
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
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { cn } from "@/lib/utils";
import { readSettings, writeSettings } from "@/lib/settings-storage";

type RailItem = {
  to: "/diagrams" | "/docs" | "/sync" | "/github" | "/settings";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const RAIL_TOP: RailItem[] = [
  { to: "/diagrams", label: "Схеми", icon: LayoutDashboard },
  { to: "/docs", label: "Нотатки", icon: FileText },
  { to: "/sync", label: "Граф", icon: GitMerge },
  { to: "/github", label: "GitHub", icon: GitBranch },
];

const RAIL_BOTTOM: RailItem[] = [
  { to: "/settings", label: "Налаштування", icon: Cog },
];

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function getBreadcrumb(pathname: string): { section: string; sub?: string } {
  if (pathname.startsWith("/diagrams")) return { section: "Diagrams" };
  if (pathname.startsWith("/diagram/editor")) return { section: "Diagrams", sub: "Editor" };
  if (pathname.startsWith("/docs")) return { section: "Docs" };
  if (pathname.startsWith("/sync")) return { section: "Sync" };
  if (pathname.startsWith("/github")) return { section: "GitHub" };
  if (pathname.startsWith("/settings")) return { section: "Settings" };
  return { section: "Workspace" };
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

  useEffect(() => {
    const t = readSettings().app.theme;
    setTheme(t === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const s = readSettings();
    writeSettings({ ...s, app: { ...s.app, theme: next } });
    applyTheme(next);
  };

  const logout = () => {
    try {
      localStorage.removeItem("jwt");
    } catch {
      /* ignore */
    }
    navigate({ to: "/login", replace: true });
  };

  const isRailActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const crumb = getBreadcrumb(location.pathname);

  const renderRailButton = (item: RailItem, active: boolean) => {
    const Icon = item.icon;
    return (
      <Tooltip key={item.to} delayDuration={300}>
        <TooltipTrigger asChild>
          <Link
            to={item.to}
            aria-label={item.label}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
              active
                ? "text-[var(--accent-amber)] bg-[var(--accent-dim)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5",
            )}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[var(--accent-amber)]"
              />
            )}
            <Icon className="h-[18px] w-[18px]" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-mono text-[11px]">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* TOP BAR — 32px */}
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="md:hidden inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              aria-label="Меню"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0">
            <SheetHeader className="border-b border-[var(--border-subtle)] px-3 py-2">
              <SheetTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
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
                      "flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 font-mono text-[12px] transition-colors",
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
          className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]"
        >
          <Terminal
            aria-hidden="true"
            className="h-3.5 w-3.5 text-[var(--accent-amber)]"
          />
          AI-DRAKON
        </Link>

        <span aria-hidden="true" className="hidden md:block h-3 w-px bg-[var(--border-subtle)] mx-1" />

        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)] min-w-0">
          <span className="text-[var(--text-secondary)]">{crumb.section}</span>
          {crumb.sub ? (
            <>
              <span>/</span>
              <span className="truncate">{crumb.sub}</span>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="AI-агенти"
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  >
                    <Bot className="h-4 w-4" />
                  </button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-[11px]">
                AI-агенти
              </TooltipContent>
            </Tooltip>
            <SheetContent
              side="right"
              className="w-full p-0 sm:max-w-[480px] sm:w-[480px] bg-[var(--bg-surface)] border-l border-[var(--border-subtle)]"
            >
              <SheetHeader className="border-b border-[var(--border-subtle)] px-4 py-3">
                <SheetTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
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
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px]">
              {theme === "dark" ? "Світла тема" : "Темна тема"}
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={logout}
                aria-label="Вийти"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px]">
              Вийти
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ICON RAIL — 40px, hidden on mobile */}
        <nav
          aria-label="Основна навігація"
          className="hidden md:flex h-full w-10 shrink-0 flex-col items-center gap-1 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2"
        >
          {RAIL_TOP.map((item) => renderRailButton(item, isRailActive(item.to)))}
          <div className="flex-1" />
          {RAIL_BOTTOM.map((item) => renderRailButton(item, isRailActive(item.to)))}
        </nav>

        {/* CONTENT SLOT */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

    </div>
  );
}

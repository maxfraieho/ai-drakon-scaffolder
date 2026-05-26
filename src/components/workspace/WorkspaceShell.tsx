import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Cog,
  Cpu,
  FileCode,
  FileText,
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
import { AgentStatusBar } from "@/components/workspace/AgentStatusBar";
import { cn } from "@/lib/utils";
import { clearAccessToken } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_WORKSPACE: NavItem[] = [
  { to: "/pipelines", label: "Pipeline", icon: Workflow },
  { to: "/diagrams", label: "Схеми", icon: LayoutDashboard },
  { to: "/code", label: "Код", icon: FileCode },
  { to: "/docs", label: "Нотатки", icon: FileText },
];

const NAV_SYSTEM: NavItem[] = [
  { to: "/agents", label: "Агенти", icon: Cpu },
  { to: "/settings", label: "Налаштування", icon: Cog },
];


function getBreadcrumb(pathname: string): { section: string; sectionPath: string; sub?: string } {
  if (pathname.startsWith("/diagram/editor")) return { section: "Diagrams", sectionPath: "/diagrams", sub: "Editor" };
  if (pathname.startsWith("/diagrams")) return { section: "Diagrams", sectionPath: "/diagrams" };
  if (pathname.startsWith("/docs")) return { section: "Нотатки", sectionPath: "/docs" };
  if (pathname.startsWith("/github")) return { section: "GitHub", sectionPath: "/github" };
  if (pathname.startsWith("/settings")) return { section: "Settings", sectionPath: "/settings" };
  if (pathname.startsWith("/agents")) return { section: "Агенти", sectionPath: "/agents" };
  if (pathname.startsWith("/pipelines")) return { section: "Pipeline", sectionPath: "/pipelines" };
  if (pathname.startsWith("/code")) return { section: "Код", sectionPath: "/code" };
  return { section: "Workspace", sectionPath: "/" };
}

function NavSection({ items, isActive, onClick }: {
  items: NavItem[];
  isActive: (to: string) => boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 font-mono text-[11px] transition-colors",
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
  );
}

function NavDivider({ label }: { label: string }) {
  return (
    <div className="px-2 pt-3 pb-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
        {label}
      </span>
    </div>
  );
}

interface WorkspaceShellProps {
  children: ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem("nav_collapsed") === "true"; } catch { return false; }
  });

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
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const logout = () => {
    clearAccessToken();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const crumb = getBreadcrumb(location.pathname);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* TOP BAR */}
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
            <nav className="p-2">
              <NavDivider label="Робочий простір" />
              <NavSection items={NAV_WORKSPACE} isActive={isActive} onClick={() => setMobileNavOpen(false)} />
              <NavDivider label="Система" />
              <NavSection items={NAV_SYSTEM} isActive={isActive} onClick={() => setMobileNavOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>

        <Link
          to="/pipelines"
          className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]"
        >
          <Terminal aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
          AI-DRAKON
        </Link>

        <span aria-hidden="true" className="hidden md:block h-3 w-px bg-[var(--border-subtle)] mx-1" />

        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)] min-w-0">
          <Link
            to={crumb.sectionPath}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
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
          className="hidden md:inline-flex items-center gap-1.5 h-5 px-2 rounded border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors ml-2"
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
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  >
                    <Bot className="h-4 w-4" />
                  </button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-[11px]">Чат з агентом</TooltipContent>
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

          <AlertDialog>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Вийти"
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] active:scale-[0.96] transition-transform duration-75"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-[11px]">Вийти</TooltipContent>
            </Tooltip>
            <AlertDialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] font-mono">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[var(--text-primary)] font-mono text-[13px] font-semibold uppercase tracking-wider">
                  Вийти з системи?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--text-muted)] text-[12px]">
                  JWT-токен буде видалено. Потрібно буде увійти знову.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-mono text-[11px] uppercase tracking-wider bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5">
                  Скасувати
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={logout}
                  className="font-mono text-[11px] uppercase tracking-wider bg-[var(--color-primary-container,#f59e0b)] text-[#2a1700] hover:brightness-110"
                >
                  Вийти
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className={cn(
          "hidden md:flex h-full shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[width] duration-200 overflow-hidden",
          navCollapsed ? "w-0 border-r-0" : "w-60",
        )}>
          <div className="border-b border-[var(--border-subtle)]">
            <ProjectSelector />
          </div>

          <nav aria-label="Основна навігація" className="flex-1 overflow-y-auto p-2">
            <NavDivider label="Робочий простір" />
            <NavSection items={NAV_WORKSPACE} isActive={isActive} />
            <NavDivider label="Система" />
            <NavSection items={NAV_SYSTEM} isActive={isActive} />
          </nav>

          <DevCyclePanel />
          <AgentStatusBar />
        </aside>

        <button
          type="button"
          onClick={() => {
            const next = !navCollapsed;
            setNavCollapsed(next);
            try { localStorage.setItem("nav_collapsed", String(next)); } catch {}
            setTimeout(() => window.dispatchEvent(new Event("resize")), 210);
          }}
          title={navCollapsed ? "Показати навігацію" : "Сховати навігацію"}
          className="hidden md:flex h-full w-2 shrink-0 items-center justify-center border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] text-[var(--text-secondary)] hover:text-[var(--accent-amber)] transition-colors cursor-pointer"
        >
          {navCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        theme={theme === "system" ? "dark" : theme}
        onToggleTheme={toggleTheme}
        onLogout={logout}
      />
    </div>
  );
}

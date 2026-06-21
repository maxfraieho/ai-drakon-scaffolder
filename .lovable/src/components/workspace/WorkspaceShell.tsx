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
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Terminal,
  Workflow,
  Brain,
  BookOpen,
  ChevronDown,
  GitBranch,
  Loader2,
  Plus,
  FileCode2,
  Code2,
  Braces,
  Activity,
  ChevronUp,
} from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { AgentStatusBar } from "@/components/workspace/AgentStatusBar";
import { cn } from "@/lib/utils";
import { clearAccessToken } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { MobileNavigationDock } from "@/components/mobile/MobileNavigationDock";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_WORKSPACE: NavItem[] = [
  { to: "/pipelines", label: "Pipeline", icon: Workflow },
  { to: "/diagrams", label: "Схеми", icon: LayoutDashboard },
  { to: "/knowledge", label: "Знання", icon: Brain }, // Added Knowledge item
  { to: "/notebooks", label: "Knowledge Agents", icon: BookOpen },
  { to: "/workspace", label: "Workspace", icon: Layers },
  { to: "/codegen", label: "Codegen", icon: Code2 },
];

const NAV_SYSTEM: NavItem[] = [
  { to: "/agents", label: "Агенти", icon: Cpu },
  { to: "/settings", label: "Налаштування", icon: Cog },
];


function getBreadcrumb(pathname: string): { section: string; sectionPath: string; sub?: string } {
  if (pathname.startsWith("/diagram/editor")) return { section: "Diagrams", sectionPath: "/diagrams", sub: "Editor" };
  if (pathname.startsWith("/diagrams")) return { section: "Diagrams", sectionPath: "/diagrams" };
  if (pathname.startsWith("/docs")) return { section: "Документація", sectionPath: "/docs" };
  if (pathname.startsWith("/settings")) return { section: "Settings", sectionPath: "/settings" };
  if (pathname.startsWith("/agents")) return { section: "Агенти", sectionPath: "/agents" };
  if (pathname.startsWith("/pipelines")) return { section: "Pipeline", sectionPath: "/pipelines" };
  if (pathname.startsWith("/knowledge")) return { section: "Знання", sectionPath: "/knowledge" };
  if (pathname.startsWith("/notebooks")) return { section: "Knowledge Agents", sectionPath: "/notebooks" };
  if (pathname.startsWith("/codegen")) return { section: "Codegen", sectionPath: "/codegen" };
  if (pathname.startsWith("/code")) return { section: "Код", sectionPath: "/code" };
  if (pathname.startsWith("/workspace")) return { section: "Workspace", sectionPath: "/workspace" };
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
              "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
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
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] opacity-50 font-medium">
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
  const { logout: appwriteLogout } = useAuth();
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { activeProject, setActiveProject, projects, loading: projectsLoading } = useProject();
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem("nav_collapsed") === "true"; } catch { return false; }
  });
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(() => {
    try { return localStorage.getItem("evidence_collapsed") === "true"; } catch { return true; }
  });
  const [evidenceData, setEvidenceData] = useState<string | null>(null);

  const iconRailItems = [
    { id: "logic", to: "/diagrams", label: "Logic", icon: GitBranch, enabled: true },
    { id: "mrna", to: "#", label: "mRNA", icon: FileCode2, enabled: false, tooltip: "Sprint 3" },
    { id: "ribosome", to: "/agents", label: "Ribosome", icon: Cpu, enabled: true },
    { id: "protein", to: "/pipelines", label: "Protein", icon: Braces, enabled: true },
    { id: "knowledge", to: "/knowledge", label: "Knowledge", icon: BookOpen, enabled: true },
    { id: "runtime", to: "/observability", label: "Runtime", icon: Activity, enabled: true },
  ];

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

  const logout = async () => {
    try {
      await appwriteLogout();
    } catch (e) {
      console.error("Appwrite logout failed:", e);
    }
    clearAccessToken();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const crumb = getBreadcrumb(location.pathname);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* TOP BAR */}
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="lg:hidden inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
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
            <div className="flex h-[calc(100%-2.5rem)] flex-col overflow-hidden">
              <div className="border-b border-[var(--border-subtle)] shrink-0">
                <ProjectSelector withDialogs={false} />
              </div>
              <nav aria-label="Мобільна навігація" className="flex-1 overflow-y-auto p-2">
                <NavDivider label="Робочий простір" />
                <NavSection items={NAV_WORKSPACE} isActive={isActive} onClick={() => setMobileNavOpen(false)} />
                <NavDivider label="Система" />
                <NavSection items={NAV_SYSTEM} isActive={isActive} onClick={() => setMobileNavOpen(false)} />
              </nav>
              <div className="shrink-0 border-t border-[var(--border-subtle)]">
                <DevCyclePanel />
                <AgentStatusBar />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          to="/pipelines"
          className="flex items-center gap-2 font-semibold text-[13px] text-[var(--text-primary)] tracking-wide"
        >
          <Terminal aria-hidden="true" className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
          AI-DRAKON
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden lg:flex items-center gap-1.5 h-5 px-2 rounded border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] hover:border-[var(--accent-amber)]/40 transition-colors max-w-[200px]"
            >
              <GitBranch className="h-3 w-3 shrink-0 text-[var(--accent-amber)]" />
              <span className="truncate">
                {projectsLoading
                  ? "..."
                  : activeProject
                    ? (activeProject.github
                        ? `${activeProject.github.owner}/${activeProject.github.repo}`
                        : activeProject.name)
                    : "Select repo"}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="min-w-[240px] bg-[var(--bg-surface)] border-[var(--border-subtle)] font-mono z-50"
          >
            {projectsLoading ? (
              <DropdownMenuItem disabled className="text-[10px] text-[var(--text-muted)] gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Завантаження...
              </DropdownMenuItem>
            ) : projects.length === 0 ? (
              <>
                <DropdownMenuItem disabled className="text-[10px] text-[var(--text-muted)]">
                  Репозиторії не додані
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[10px] text-[var(--accent-amber)] cursor-pointer gap-1.5"
                  onClick={() => document.dispatchEvent(new CustomEvent("open-add-repo"))}
                >
                  <Plus className="h-3 w-3" />
                  Додати репозиторій
                </DropdownMenuItem>
              </>
            ) : (
              projects.map((p) => (
                <DropdownMenuItem
                  key={p.slug}
                  onClick={() => setActiveProject(p)}
                  className={`text-[10px] cursor-pointer gap-2 ${
                    p.slug === activeProject?.slug
                      ? "text-[var(--accent-amber)] bg-[var(--accent-dim)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  <span className="truncate">
                    {p.github
                      ? `${p.github.owner}/${p.github.repo}`
                      : p.name}
                  </span>
                  {p.slug === activeProject?.slug && (
                    <span className="ml-auto text-[8px] text-[var(--accent-amber)]">✓</span>
                  )}
                </DropdownMenuItem>
              ))
            )}
            {!projectsLoading && (
              <>
                <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
                <DropdownMenuItem
                  className="text-[10px] text-[var(--text-muted)] cursor-pointer gap-1.5"
                  onClick={() => document.dispatchEvent(new CustomEvent("open-project-manager"))}
                >
                  <Plus className="h-3 w-3" />
                  Управління репозиторіями
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <span aria-hidden="true" className="hidden lg:block h-3 w-px bg-[var(--border-subtle)] mx-1" />

        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)] min-w-0">
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
          className="hidden lg:inline-flex items-center gap-1.5 h-5 px-2 rounded border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors ml-2"
          aria-label="Відкрити command palette"
        >
          <span>⌘K</span>
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          {!location.pathname.startsWith("/agents") && (
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
          )}

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
            <AlertDialogContent className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl font-sans shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[var(--text-primary)] text-base font-semibold">
                  Вийти з системи?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--text-muted)] text-sm">
                  JWT-токен буде видалено. Потрібно буде увійти знову.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-sm bg-transparent border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 rounded-xl">
                  Скасувати
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={logout}
                  className="text-sm bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl"
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
        {/* Left IconRail */}
        <div className="hidden lg:flex w-10 h-full shrink-0 flex-col items-center py-4 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] select-none">
          <div className="flex flex-col items-center gap-5 w-full">
            {iconRailItems.map((item) => {
              const Icon = item.icon;
              const active = item.enabled && isActive(item.to);
              
              if (!item.enabled) {
                return (
                  <Tooltip key={item.id} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div
                        title={item.tooltip}
                        className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] opacity-40"
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono text-[11px]">
                      {item.label} ({item.tooltip})
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Tooltip key={item.id} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                        active
                          ? "bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                          : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-mono text-[11px]">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <aside className={cn(
          "hidden lg:flex h-full shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[width] duration-200 overflow-hidden",
          navCollapsed ? "w-0 border-r-0" : "w-64",
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
          className="hidden lg:flex h-full w-2 shrink-0 items-center justify-center border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] text-[var(--text-secondary)] hover:text-[var(--accent-amber)] transition-colors cursor-pointer"
        >
          {navCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <main className="flex-1 min-h-0 overflow-y-auto pb-16 lg:pb-0">
            {children}
          </main>

          {/* Evidence Drawer Collapse Toggle Strip */}
          <button
            type="button"
            onClick={() => {
              const next = !evidenceCollapsed;
              setEvidenceCollapsed(next);
              try { localStorage.setItem("evidence_collapsed", String(next)); } catch {}
              setTimeout(() => window.dispatchEvent(new Event("resize")), 210);
            }}
            title={evidenceCollapsed ? "Показати EVIDENCE" : "Сховати EVIDENCE"}
            className="flex w-full h-2 shrink-0 items-center justify-center border-t border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] text-[var(--text-secondary)] hover:text-[var(--accent-amber)] transition-colors cursor-pointer"
          >
            {evidenceCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Evidence Drawer Content Panel */}
          <div
            className={cn(
              "w-full bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] transition-[height] duration-200 overflow-hidden flex flex-col shrink-0",
              evidenceCollapsed ? "h-0 border-t-0" : "h-64",
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-1 bg-[var(--bg-surface)] shrink-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-semibold">
                EVIDENCE
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-[var(--text-secondary)]">
              {evidenceData ? (
                <div className="p-4 font-mono text-sm text-gray-300 overflow-auto">
                  <pre className="whitespace-pre-wrap">{evidenceData}</pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
                  No analysis data yet. Save a diagram to see impact analysis.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNavigationDock />

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

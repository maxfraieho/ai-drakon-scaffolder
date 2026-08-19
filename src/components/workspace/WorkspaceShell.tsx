import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Cpu,
  BookOpen,
  GitBranch,
  FileCode2,
  Braces,
  Terminal,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { useAuth } from "@/context/AuthContext";
import { useProject } from "@/context/ProjectContext";
import { AgentStatusBar } from "@/components/workspace/AgentStatusBar";
import { cn } from "@/lib/utils";
import { clearAccessToken } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { MobileNavigationDock } from "@/components/mobile/MobileNavigationDock";
import { loadKnowledgeGraph } from "@/lib/understand/agent-context";
import { buildDiffContext, formatDiffAnalysis } from "@/lib/understand/diff";
import { getGithubConfig } from "@/lib/settings-storage";
import { AstryxHeader } from "@/components/astryx/AstryxHeader";
import { AstryxSideNav } from "@/components/astryx/AstryxSideNav";

interface WorkspaceShellProps {
  children: ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: appwriteLogout } = useAuth();
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { activeProject } = useProject();
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem("nav_collapsed") === "true"; } catch { return false; }
  });
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(() => {
    try { return localStorage.getItem("evidence_collapsed") === "true"; } catch { return true; }
  });
  const [evidenceData, setEvidenceData] = useState<string | null>(() => {
    try { return localStorage.getItem("evidence_last") || null; } catch { return null; }
  });
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  
  const [selectedNode, setSelectedNode] = useState<{ id: string; content: string } | null>(null);
  const [allComments, setAllComments] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<'evidence' | 'comments'>('evidence');
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    const handleSelection = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.selectedNodeId) {
        setSelectedNode({
          id: detail.selectedNodeId,
          content: detail.selectedNodeContent || `Вузол #${detail.selectedNodeId}`
        });
      } else {
        setSelectedNode(null);
      }
    };

    const handleComments = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAllComments(detail.comments || {});
    };

    document.addEventListener('drakon-selection-changed', handleSelection);
    document.addEventListener('drakon-comments-updated', handleComments);

    return () => {
      document.removeEventListener('drakon-selection-changed', handleSelection);
      document.removeEventListener('drakon-comments-updated', handleComments);
    };
  }, []);

  const handlePostComment = () => {
    if (!selectedNode || !newCommentText.trim()) return;
    const author = user?.name || 'Гість';
    if ((window as any).addDrakonComment) {
      (window as any).addDrakonComment(selectedNode.id, newCommentText, author);
      setNewCommentText('');
    } else {
      console.warn("Realtime sync comment function not bound yet. Is the diagram loaded?");
    }
  };

  const iconRailItems = [
    { id: "logic", to: "/diagrams", label: "Logic", icon: GitBranch, enabled: true },
    { id: "mrna", to: "#", label: "mRNA", icon: FileCode2, enabled: false, tooltip: "Sprint 3" },
    { id: "ribosome", to: "/agents", label: "Ribosome", icon: Cpu, enabled: true },
    { id: "protein", to: "/pipelines", label: "Protein", icon: Braces, enabled: true },
    { id: "knowledge", to: "/knowledge", label: "Knowledge", icon: BookOpen, enabled: true },
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

  /* ── EVIDENCE: listen for diagram-saved events ── */
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const changedFiles: string[] = detail?.changedFiles ?? [];
      const ghCfg = getGithubConfig();
      const owner = activeProject?.github?.owner || ghCfg.owner || "";
      const repo = activeProject?.github?.repo || ghCfg.repo || "";
      const token = ghCfg.token || "";
      if (!owner || !repo || !token) return;

      setEvidenceLoading(true);
      try {
        const graph = await loadKnowledgeGraph(owner, repo, token);
        if (graph) {
          const diffCtx = buildDiffContext(graph, changedFiles);
          const analysis = formatDiffAnalysis(diffCtx);
          setEvidenceData(analysis);
          setEvidenceCollapsed(false);
          try { localStorage.setItem("evidence_collapsed", "false"); } catch {}
          try { localStorage.setItem("evidence_last", analysis); } catch {}
        } else {
          setEvidenceData("Knowledge graph not available.\nCommit a .understand-anything/knowledge-graph.json file to enable impact analysis.");
        }
      } catch (err) {
        setEvidenceData("Error running diff analysis: " + (err instanceof Error ? err.message : "Unknown"));
      } finally {
        setEvidenceLoading(false);
      }
    };
    document.addEventListener("diagram-saved", handler);
    return () => document.removeEventListener("diagram-saved", handler);
  }, [activeProject]);

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

  const isProjectHubView = location.pathname.startsWith("/p/");
  const isProjectsListView = location.pathname === "/";
  const isCleanView = isProjectsListView || isProjectHubView;

  if (isCleanView) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]">
        {isProjectsListView ? (
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] px-4">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold text-[13px] text-[var(--astryx-text-primary)] tracking-wide"
            >
              <Terminal aria-hidden="true" className="h-3.5 w-3.5 text-[var(--astryx-color-brand)]" />
              AI-DRAKON
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <nav aria-label="Верхня навігація проєктів" className="hidden md:flex items-center gap-4 mr-4 text-sm text-[var(--astryx-text-secondary)]">
                <Link to="/diagrams" className="hover:text-[var(--astryx-text-primary)] transition-colors">Схеми</Link>
                <Link to="/notebooks" className="hover:text-[var(--astryx-text-primary)] transition-colors">NotebookLM</Link>
                <Link to="/pipelines" className="hover:text-[var(--astryx-text-primary)] transition-colors">Pipelines</Link>
                <Link to="/agents" className="hover:text-[var(--astryx-text-primary)] transition-colors">Агенти</Link>
              </nav>

              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--astryx-radius-sm)] border border-[var(--astryx-border-subtle)] px-2 font-mono text-[11px] text-[var(--astryx-text-muted)] hover:bg-[var(--astryx-surface-secondary)] hover:text-[var(--astryx-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--astryx-border-focus)]"
                aria-label="Відкрити command palette"
                data-variant="ghost"
                data-size="sm"
                data-testid="clean-view-search-btn"
              >
                <span>⌘K</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Світла тема" : "Темна тема"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--astryx-radius-sm)] text-[var(--astryx-text-muted)] hover:bg-[var(--astryx-surface-secondary)] hover:text-[var(--astryx-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--astryx-border-focus)]"
                data-variant="ghost"
                data-size="sm"
                data-testid="clean-view-theme-btn"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Вийти"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--astryx-radius-sm)] text-[var(--astryx-text-muted)] hover:bg-[var(--astryx-surface-secondary)] hover:text-[var(--astryx-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--astryx-border-focus)]"
                    data-variant="ghost"
                    data-size="sm"
                    data-testid="clean-view-logout-btn"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[var(--astryx-surface-elevated)] border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-lg)] font-sans shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[var(--astryx-text-primary)] text-base font-semibold">
                      Вийти з системи?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[var(--astryx-text-muted)] text-sm">
                      JWT-токен буде видалено. Потрібно буде увійти знову.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-sm bg-transparent border border-[var(--astryx-border-subtle)] text-[var(--astryx-text-secondary)] hover:bg-[var(--astryx-surface-secondary)] rounded-[var(--astryx-radius-md)]">
                      Скасувати
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={logout}
                      className="text-sm bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold rounded-[var(--astryx-radius-md)]"
                    >
                      Вийти
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
        ) : null}

        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>

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

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]">
      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 border-r border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] text-[var(--astryx-text-primary)]"
        >
          <SheetHeader className="px-3 py-2 border-b border-[var(--astryx-border-subtle)]">
            <SheetTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--astryx-text-muted)]">
              Навігація
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-2.5rem)] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[var(--astryx-border-subtle)]">
              <ProjectSelector withDialogs={false} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <AstryxSideNav
                aria-label="Мобільна навігація"
                onItemClick={() => setMobileNavOpen(false)}
              />
            </div>
            <div className="shrink-0 border-t border-[var(--astryx-border-subtle)]">
              <DevCyclePanel />
              <AgentStatusBar />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* TOP BAR */}
      <AstryxHeader
        onOpenCmd={() => setCmdOpen(true)}
        onLogout={logout}
        onOpenAgentChat={() => setAgentsOpen(true)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />

      {/* AGENT CHAT DRAWER */}
      <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:max-w-[480px] sm:w-[480px] bg-[var(--astryx-surface-elevated)] border-l border-[var(--astryx-border-subtle)] text-[var(--astryx-text-primary)]"
        >
          <SheetHeader className="border-b border-[var(--astryx-border-subtle)] px-4 py-3">
            <SheetTitle className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--astryx-text-muted)]">
              AI-агенти
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-3.25rem)]">
            <AgentChatPanel className="h-full" />
          </div>
        </SheetContent>
      </Sheet>

      {/* WORKSPACE BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left IconRail */}
        <div className="hidden lg:flex w-10 h-full shrink-0 flex-col items-center py-4 select-none border-r border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)]">
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
                        role="button"
                        aria-disabled="true"
                        tabIndex={-1}
                        data-variant="ghost"
                        data-size="sm"
                        data-testid={`iconrail-item-${item.id}-disabled`}
                        className="flex h-7 w-7 cursor-not-allowed items-center justify-center opacity-40 select-none rounded-[var(--astryx-radius-sm)] text-[var(--astryx-text-muted)]"
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
                      data-variant="ghost"
                      data-size="sm"
                      data-testid={`iconrail-item-${item.id}`}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 rounded-[var(--astryx-radius-sm)] focus-visible:ring-[var(--astryx-border-focus)]",
                        active
                          ? "bg-[var(--astryx-color-brand-light)] text-[var(--astryx-color-brand)]"
                          : "text-[var(--astryx-text-secondary)] hover:bg-[var(--astryx-surface-secondary)] hover:text-[var(--astryx-text-primary)]",
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

        {/* Sidebar */}
        <aside className={cn(
          "hidden lg:flex h-full shrink-0 flex-col transition-[width] duration-200 overflow-hidden border-r border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)]",
          navCollapsed ? "w-0 border-r-0" : "w-64",
        )}>
          <div className="border-b border-[var(--astryx-border-subtle)]">
            <ProjectSelector />
          </div>
          <AstryxSideNav />
          <DevCyclePanel />
          <AgentStatusBar />
        </aside>

        {/* Navigation Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const next = !navCollapsed;
            setNavCollapsed(next);
            try { localStorage.setItem("nav_collapsed", String(next)); } catch {}
            setTimeout(() => window.dispatchEvent(new Event("resize")), 210);
          }}
          title={navCollapsed ? "Показати навігацію" : "Сховати навігацію"}
          data-variant="ghost"
          data-size="sm"
          data-testid="nav-collapse-toggle"
          className="hidden lg:flex h-full w-2 shrink-0 items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 border-r border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] hover:bg-[var(--astryx-color-brand-light)] text-[var(--astryx-text-secondary)] hover:text-[var(--astryx-color-brand)] focus-visible:ring-[var(--astryx-border-focus)]"
        >
          {navCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <main className="flex-1 min-h-0 overflow-y-auto">
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
            data-variant="ghost"
            data-size="sm"
            data-testid="evidence-collapse-toggle"
            className="flex w-full h-2 shrink-0 items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 border-t border-b border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-elevated)] hover:bg-[var(--astryx-color-brand-light)] text-[var(--astryx-text-secondary)] hover:text-[var(--astryx-color-brand)] focus-visible:ring-[var(--astryx-border-focus)]"
          >
            {evidenceCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Evidence Drawer Content Panel */}
          <div
            className={cn(
              "w-full bg-[var(--astryx-surface-elevated)] border-t border-[var(--astryx-border-subtle)] transition-[height] duration-200 overflow-hidden flex flex-col shrink-0",
              evidenceCollapsed ? "h-0 border-t-0" : "h-[300px]",
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--astryx-border-subtle)] px-3 py-1 bg-[var(--astryx-surface-elevated)] shrink-0">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('evidence')}
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.2em] font-semibold cursor-pointer pb-0.5 border-b-2 transition-colors",
                    activeTab === 'evidence' 
                      ? "text-[var(--astryx-color-brand)] border-[var(--astryx-color-brand)]"
                      : "text-[var(--astryx-text-muted)] border-transparent hover:text-[var(--astryx-text-secondary)]"
                  )}
                >
                  EVIDENCE
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.2em] font-semibold cursor-pointer pb-0.5 border-b-2 transition-colors",
                    activeTab === 'comments' 
                      ? "text-[var(--astryx-color-brand)] border-[var(--astryx-color-brand)]"
                      : "text-[var(--astryx-text-muted)] border-transparent hover:text-[var(--astryx-text-secondary)]"
                  )}
                >
                  COMMENTS {selectedNode && `(#${selectedNode.id})`}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 text-[var(--astryx-text-secondary)] flex flex-col min-h-0">
              {activeTab === 'evidence' ? (
                evidenceLoading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-[var(--astryx-text-muted)] font-mono text-[11px]">
                    <span className="animate-spin h-3 w-3 border-b-2 border-[var(--astryx-color-brand)] rounded-full inline-block" />
                    Аналіз впливу…
                  </div>
                ) : evidenceData ? (
                  <div className="p-3 font-mono text-[11px] text-[var(--astryx-text-secondary)] overflow-auto">
                    <pre className="whitespace-pre-wrap leading-relaxed">{evidenceData}</pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--astryx-text-muted)] border border-dashed border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-sm)] text-[11px] font-mono">
                    Збережіть діаграму, щоб побачити аналіз впливу змін.
                  </div>
                )
              ) : (
                /* Comments tab */
                <div className="flex-1 flex flex-col gap-3 min-h-0">
                  {!selectedNode ? (
                    <div className="flex-1 flex items-center justify-center text-[var(--astryx-text-muted)] border border-dashed border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-sm)] text-[11px] font-mono">
                      Виберіть один вузол на діаграмі, щоб переглянути або залишити коментарі.
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                      {/* Comments List */}
                      <div className="flex-1 overflow-y-auto border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-sm)] p-2 bg-[var(--astryx-surface-page)] flex flex-col gap-2">
                        {(!allComments[selectedNode.id] || allComments[selectedNode.id].length === 0) ? (
                          <div className="text-[var(--astryx-text-muted)] text-[11px] italic p-2 font-mono">
                            Коментарів до вузла {selectedNode.content} ще немає. Будьте першим!
                          </div>
                        ) : (
                          allComments[selectedNode.id].map((c: any) => (
                            <div key={c.id} className="text-[11px] border-b border-[var(--astryx-border-subtle)] pb-1.5 last:border-b-0 font-mono">
                              <div className="flex justify-between text-[10px] text-[var(--astryx-text-muted)] mb-0.5">
                                <span className="font-semibold text-[var(--astryx-text-secondary)]">{c.author}</span>
                                <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-[var(--astryx-text-secondary)]">{c.text}</div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {/* Add comment form */}
                      <div className="flex gap-2 items-center mt-auto shrink-0">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder={`Коментар до вузла "${selectedNode.content}"...`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostComment();
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-[var(--astryx-surface-page)] border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-sm)] text-[var(--astryx-text-primary)] focus:outline-none focus:border-[var(--astryx-border-focus)] font-mono"
                        />
                        <button
                          type="button"
                          onClick={handlePostComment}
                          disabled={!newCommentText.trim()}
                          className="px-3 py-1.5 text-xs bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] disabled:opacity-50 text-[var(--astryx-color-on-brand)] font-semibold rounded-[var(--astryx-radius-sm)] cursor-pointer transition-colors font-mono"
                        >
                          Надіслати
                        </button>
                      </div>
                    </div>
                  )}
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


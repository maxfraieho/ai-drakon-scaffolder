import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bot, Github, LogOut, Moon, Sun } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { ProjectSidebar } from "@/components/layout/ProjectSidebar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { clearAccessToken } from "@/lib/auth";
import { getProject } from "@/lib/appwrite-projects";
import type { Project } from "@/lib/schemas/project";

type ProjectLayoutContextValue = {
  slug: string;
  project?: Project;
  isLoading: boolean;
};

const ProjectLayoutContext = createContext<ProjectLayoutContextValue | null>(null);

const sectionLabels: Record<string, string> = {
  overview: "Overview",
  agents: "Agents",
  playpipe: "PlayPipe",
  automations: "Automations",
  docs: "Docs",
  settings: "Settings",
};

export function useProjectLayout() {
  const context = useContext(ProjectLayoutContext);
  if (!context) {
    throw new Error("useProjectLayout must be used inside ProjectLayout");
  }
  return context;
}

export function ProjectLayout({ slug, children }: { slug: string; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: appwriteLogout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);

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

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => getProject(slug),
    staleTime: 5 * 60 * 1000,
  });

  const sectionKey = location.pathname.split("/").filter(Boolean).at(-1) ?? "overview";
  const currentSection = sectionLabels[sectionKey] ?? "Overview";

  if (isLoading) {
    return (
      <div className="relative min-h-[calc(100vh-3rem)] overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.2),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(217,70,239,0.18),transparent_40%)]" />
        <div className="relative flex min-h-[calc(100vh-3rem)]">
          <ProjectSidebar slug={slug} loading />
          <main className="flex-1 p-4 md:p-6">
            <Card className="border-white/10 bg-slate-900/45 backdrop-blur-xl">
              <CardContent className="space-y-3 p-6">
                <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-72 animate-pulse rounded bg-white/10" />
                <div className="h-36 animate-pulse rounded bg-white/10" />
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-slate-950 px-4 text-slate-100">
        <Card className="w-full max-w-lg border-rose-400/30 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-300" />
            <h2 className="font-[Outfit] text-2xl">Project not found</h2>
            <p className="text-sm text-slate-300">We couldn't find this project or load its data.</p>
            <Button onClick={() => navigate({ to: "/" })}>Back to Projects</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const githubUrl =
    project.githubOwner && project.githubRepo
      ? `https://github.com/${project.githubOwner}/${project.githubRepo}`
      : undefined;

  return (
    <ProjectLayoutContext.Provider value={{ slug, project, isLoading: false }}>
      <div className="relative min-h-[calc(100vh-3rem)] overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.2),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(217,70,239,0.18),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.18),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative flex min-h-[calc(100vh-3rem)]">
          <ProjectSidebar slug={slug} mode={project.mode} />

          <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col pb-20 md:pb-0">
            <header className="border-b border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-xl md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/">Projects</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{project.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentSection}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                {githubUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={githubUrl} target="_blank" rel="noreferrer" className="border-white/20 bg-white/5">
                      <Github className="h-4 w-4" />
                      Repository
                    </a>
                  </Button>
                ) : null}

                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCmdOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded border border-white/20 bg-white/5 px-2 font-mono text-[11px] text-slate-300 hover:bg-white/10 hover:text-slate-100 transition-colors"
                    aria-label="Open command palette"
                  >
                    <span>⌘K</span>
                  </button>

                  <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        aria-label="Agent chat"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-slate-100"
                      >
                        <Bot className="h-4 w-4" />
                      </button>
                    </SheetTrigger>
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

                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === "dark" ? "Світла тема" : "Темна тема"}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-slate-100"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="Вийти"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-slate-100"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
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
              </div>
            </header>

            <section className="flex-1 p-4 md:p-6">{children}</section>
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
    </ProjectLayoutContext.Provider>
  );
}

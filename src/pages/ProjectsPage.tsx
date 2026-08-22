import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, PlusCircle, Plus } from "lucide-react";

import { ProjectCard, type ProjectCardProps } from "@/components/projects/ProjectCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

function mapStatus(project: Record<string, unknown>): ProjectCardProps["status"] {
  const rawStatus = String(project.status ?? "").toLowerCase();
  if (rawStatus === "error" || rawStatus === "failed") return "error";
  if (rawStatus === "draft" || rawStatus === "pending") return "draft";
  if (Boolean(project.exists) === false) return "draft";
  return "deployed";
}

function mapMode(project: Record<string, unknown>): ProjectCardProps["mode"] {
  const mode = String(project.mode ?? "agent").toLowerCase();
  if (mode === "playpipe") return "playpipe";
  if (mode === "n8n") return "n8n";
  return "agent";
}

function toProjectCards(projects: unknown[]): ProjectCardProps[] {
  return projects
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((project, index) => {
      const slug = typeof project.slug === "string" && project.slug.trim().length > 0
        ? project.slug
        : `project-${index + 1}`;

      return {
        id: typeof project.id === "string" && project.id.trim().length > 0 ? project.id : slug,
        slug,
        name: typeof project.name === "string" && project.name.trim().length > 0 ? project.name : slug,
        mode: mapMode(project),
        status: mapStatus(project),
        description: typeof project.description === "string" ? project.description : undefined,
        agentCount: typeof project.agentCount === "number"
          ? project.agentCount
          : typeof project.agents === "number"
            ? project.agents
            : undefined,
        updatedAt: typeof project.updatedAt === "string" ? project.updatedAt : undefined,
      };
    });
}

export function ProjectsPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects", "list"],
    queryFn: () => api.listProjects(),
    retry: false,
  });

  const projects = useMemo(() => {
    if (!data?.success || !Array.isArray(data.projects)) return [];
    return toProjectCards(data.projects);
  }, [data]);

  if (isLoading) {
    return (
      <section className="astryx-migrated relative min-h-[70vh] overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] p-6 md:p-10" data-testid="projects-page">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute -top-16 left-1/4 h-72 w-72 rounded-full bg-[var(--astryx-color-brand-light)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-1/4 h-72 w-72 rounded-full bg-[var(--astryx-color-brand-light)] blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] px-6 py-4 backdrop-blur-sm shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--astryx-color-brand)]" aria-hidden="true" />
            <span className="text-sm text-[var(--astryx-text-primary)]">Loading projects…</span>
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
    const isNetworkOrCors = errorMsg.toLowerCase().includes("fetch") || 
                            errorMsg.toLowerCase().includes("network") || 
                            errorMsg.toLowerCase().includes("cors");

    return (
      <section className="astryx-migrated relative min-h-[70vh] overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] p-6 md:p-10" data-testid="projects-page">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-2xl pt-10">
          <div className="rounded-xl border border-red-500/20 bg-[var(--astryx-surface-primary)] p-6 text-[var(--astryx-text-primary)] backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
              <AlertCircle className="h-6 w-6 text-rose-400" />
              <div>
                <h2 className="text-xl font-semibold text-[var(--astryx-text-primary)]">Помилка завантаження проектів</h2>
                <p className="text-xs text-rose-300 font-mono mt-0.5">Деталі: {errorMsg}</p>
              </div>
            </div>

            {isNetworkOrCors ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--astryx-text-secondary)]">
                  Помилка типу <strong>"Failed to fetch"</strong> зазвичай означає відсутність налаштованого CORS у вашому кабінеті Appwrite. Будь ласка, виконайте ці прості кроки для вирішення:
                </p>
                <div className="space-y-3 text-sm text-[var(--astryx-text-secondary)]">
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 mt-0.5">1</span>
                    <p>
                      Відкрийте консоль Appwrite: <a href="https://auth.aidrakon.tech" target="_blank" rel="noreferrer" className="text-[var(--astryx-color-brand)] hover:underline font-medium">auth.aidrakon.tech</a>
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 mt-0.5">2</span>
                    <p>
                      Перейдіть до вашого проекту (Project ID: <code className="bg-[var(--astryx-surface-secondary)] px-1 py-0.5 rounded text-xs font-mono">6a23420a003a04b4997b</code>).
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 mt-0.5">3</span>
                    <p>
                      Оберіть розділ <strong>Settings</strong> (або Platforms) та додайте нову <strong>Web Platform</strong>.
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 mt-0.5">4</span>
                    <p>
                      У полі <strong>Hostname</strong> вкажіть домен цього сайту: <code className="bg-[var(--astryx-surface-secondary)] px-1.5 py-0.5 rounded text-xs font-mono">{typeof window !== "undefined" ? window.location.hostname : "aidrakon.tech"}</code>
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 mt-0.5">5</span>
                    <p>
                      Збережіть та перезавантажте цю сторінку.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--astryx-text-secondary)]">
                Виникла помилка під час зв'язку із сервером бази даних Appwrite. Переконайтеся, що ви авторизовані та хост працює.
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--astryx-border-subtle)]">
              <Button onClick={() => window.location.reload()} className="bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold">
                Повторити запит
              </Button>
              <Button onClick={() => navigate({ to: "/login" })} variant="outline" className="border-[var(--astryx-border-subtle)] bg-transparent text-[var(--astryx-text-primary)] hover:bg-[var(--astryx-surface-secondary)]">
                Перейти до авторизації
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="astryx-migrated relative min-h-[70vh] overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] p-6 md:p-10" data-testid="projects-page">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-[var(--astryx-color-brand-light)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-1/3 h-72 w-72 rounded-full bg-[var(--astryx-color-brand-light)] blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] p-8 text-center shadow-xl backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--astryx-color-brand-light)] shadow-sm">
              <PlusCircle className="h-10 w-10 text-[var(--astryx-color-brand)]" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--astryx-text-primary)]">Create your first project</h1>
            <p className="mt-2 text-sm text-[var(--astryx-text-secondary)]">Start by creating a new workspace project.</p>
            <Button
              id="new-project-btn"
              className="mt-6 bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold"
              onClick={() => navigate({ to: "/project/new", search: { template: undefined } })}
            >
              New Project
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="astryx-migrated relative min-h-[70vh] overflow-hidden bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] p-6 md:p-10" data-testid="projects-page">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-[var(--astryx-color-brand-light)] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 right-1/4 h-72 w-72 rounded-full bg-[var(--astryx-color-brand-light)] blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--astryx-border-subtle)] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[var(--astryx-text-primary)] md:text-3xl">Projects</h1>
            <p className="text-sm text-[var(--astryx-text-secondary)]">Your active workspaces and deployment status.</p>
          </div>
          <Button
            id="new-project-btn"
            onClick={() => navigate({ to: "/project/new", search: { template: undefined } })}
            className="self-start sm:self-auto bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

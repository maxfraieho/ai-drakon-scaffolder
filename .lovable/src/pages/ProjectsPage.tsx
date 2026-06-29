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
  });

  const projects = useMemo(() => {
    if (!data?.success || !Array.isArray(data.projects)) return [];
    return toProjectCards(data.projects);
  }, [data]);

  if (isLoading) {
    return (
      <section className="relative min-h-[70vh] overflow-hidden p-6 md:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute -top-16 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-card/45 px-6 py-4 backdrop-blur-sm shadow-[0_14px_44px_rgba(0,0,0,0.35)]">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm text-foreground/90">Loading projects…</span>
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="relative min-h-[70vh] overflow-hidden p-6 md:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-6xl pt-16">
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-100 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Couldn’t load projects</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Unknown error occurred."}
            </AlertDescription>
          </Alert>
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="relative min-h-[70vh] overflow-hidden p-6 md:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-white/15 bg-card/50 p-8 text-center shadow-[0_18px_54px_rgba(0,0,0,0.38)] backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 shadow-[0_0_45px_rgba(99,102,241,0.35)]">
              <PlusCircle className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Create your first project</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start by creating a new workspace project.</p>
            <Button
              id="new-project-btn"
              className="mt-6"
              onClick={() => navigate({ to: "/project/new" })}
            >
              New Project
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[70vh] overflow-hidden p-6 md:p-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 right-1/4 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Projects</h1>
            <p className="text-sm text-muted-foreground">Your active workspaces and deployment status.</p>
          </div>
          <Button
            id="new-project-btn"
            onClick={() => navigate({ to: "/project/new" })}
            className="self-start sm:self-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
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
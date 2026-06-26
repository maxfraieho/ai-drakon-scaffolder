import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Github } from "lucide-react";
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
import { ProjectSidebar } from "@/components/layout/ProjectSidebar";
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
              </div>
            </header>

            <section className="flex-1 p-4 md:p-6">{children}</section>
          </main>
        </div>
      </div>
    </ProjectLayoutContext.Provider>
  );
}

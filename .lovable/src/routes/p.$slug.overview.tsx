import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, Github, Package, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectSectionPlaceholder } from "@/components/projects/ProjectSectionPlaceholder";
import { useProjectLayout } from "@/layouts/ProjectLayout";

export const Route = createFileRoute("/p/$slug/overview")({
  component: ProjectOverviewRoute,
});

function ProjectOverviewRoute() {
  const { slug, project } = useProjectLayout();

  const ModeIcon = project?.mode === "agent" ? Bot : project?.mode === "playpipe" ? Package : Workflow;
  const githubUrl =
    project?.githubOwner && project?.githubRepo
      ? `https://github.com/${project.githubOwner}/${project.githubRepo}`
      : undefined;

  return (
    <ProjectSectionPlaceholder
      title="Overview"
      subtitle="Central project summary with mode, integration status, and quick navigation to your working surfaces."
      chips={[`Mode: ${project?.mode ?? "n/a"}`, project?.runtimeTarget ? `Runtime: ${project.runtimeTarget}` : "Runtime: flue"]}
      actions={
        <>
          <Button asChild size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500">
            <Link to="/p/$slug/settings" params={{ slug }}>
              Open settings
            </Link>
          </Button>
          {githubUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="border-white/20 bg-white/5 text-slate-100">
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-white/10 bg-slate-950/50 md:col-span-2">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Project</p>
            <h3 className="font-[Outfit] text-xl text-slate-100">{project?.name}</h3>
            <p className="text-sm text-slate-300">{project?.description || "No description yet."}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-950/50">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mode</p>
            <Badge className="w-fit border-indigo-400/30 bg-indigo-500/15 text-indigo-200">
              <ModeIcon className="mr-1 h-3.5 w-3.5" />
              {project?.mode}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </ProjectSectionPlaceholder>
  );
}

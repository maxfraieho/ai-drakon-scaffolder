import { useNavigate } from "@tanstack/react-router";
import { Bot, GitBranch, Package, Settings, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProjectCardProps {
  id: string;
  slug: string;
  name: string;
  mode: "agent" | "playpipe" | "n8n";
  status: "deployed" | "draft" | "error";
  description?: string;
  agentCount?: number;
  updatedAt?: string;
}

type ModeMeta = {
  label: string;
  borderClass: string;
  badgeClass: string;
  Icon: typeof Bot;
};

const modeMeta: Record<ProjectCardProps["mode"], ModeMeta> = {
  agent: {
    label: "Agent",
    borderClass: "border-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Icon: Bot,
  },
  playpipe: {
    label: "Playpipe",
    borderClass: "border-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Icon: Package,
  },
  n8n: {
    label: "n8n",
    borderClass: "border-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Icon: Workflow,
  },
};

const statusMeta: Record<ProjectCardProps["status"], { label: string; dot: string }> = {
  deployed: { label: "Live", dot: "bg-emerald-400" },
  draft: { label: "Draft", dot: "bg-amber-400" },
  error: { label: "Error", dot: "bg-red-400" },
};

function formatUpdatedAt(updatedAt?: string) {
  if (!updatedAt) return "Updated recently";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Updated recently";
  return `Updated ${date.toLocaleDateString()}`;
}

export function ProjectCard({ project }: { project: ProjectCardProps }) {
  const navigate = useNavigate();
  const mode = modeMeta[project.mode];
  const status = statusMeta[project.status];
  const ModeIcon = mode.Icon;

  const openProject = () => navigate({ to: `/p/${project.slug}/overview` as never });
  const openSettings = () => navigate({ to: "/settings" });

  return (
    <article
      id={`project-card-${project.slug}`}
      className={`group relative overflow-hidden rounded-lg border border-white/10 bg-card/45 p-5 backdrop-blur-sm shadow-[0_14px_44px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-card/55 border-l-4 ${mode.borderClass}`}
    >
      <button
        type="button"
        id={`project-main-${project.slug}`}
        className="absolute inset-0 z-10 cursor-pointer"
        aria-label={`Open ${project.name}`}
        onClick={openProject}
      />

      <div className="relative z-20 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30">
            <ModeIcon className="h-5 w-5 text-foreground/90" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{project.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{project.slug}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-foreground/80">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          <span>{status.label}</span>
        </div>
      </div>

      <div className="relative z-20 mt-4 space-y-3">
        <Badge className={`${mode.badgeClass} border`}>{mode.label}</Badge>

        <p className="line-clamp-2 min-h-10 text-sm text-foreground/80">
          {project.description?.trim() || "No description yet."}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{typeof project.agentCount === "number" ? `${project.agentCount} agents` : "—"}</span>
          <span>{formatUpdatedAt(project.updatedAt)}</span>
        </div>
      </div>

      <div className="pointer-events-none relative z-20 mt-4 flex items-center gap-2 opacity-0 transition-all duration-300 scale-95 group-hover:opacity-100 group-hover:scale-100">
        <Button
          id={`open-project-${project.slug}`}
          size="sm"
          className="pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            openProject();
          }}
        >
          Open
        </Button>
        <Button
          id={`settings-project-${project.slug}`}
          size="sm"
          variant="outline"
          className="pointer-events-auto border-white/20 bg-transparent text-foreground hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            openSettings();
          }}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Button>
        {project.mode === "n8n" && <GitBranch className="ml-auto h-4 w-4 text-orange-300/80" aria-hidden="true" />}
      </div>
    </article>
  );
}
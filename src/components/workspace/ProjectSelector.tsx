import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useProject, type Project } from "@/context/ProjectContext";

function toProject(input: unknown): Project | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const slug = typeof data.slug === "string" ? data.slug : "";
  if (!slug) return null;

  return {
    slug,
    name: typeof data.name === "string" ? data.name : slug,
    description: typeof data.description === "string" ? data.description : "",
    hasDrakonIr: Boolean(data.hasDrakonIr),
    hasDocs: Boolean(data.hasDocs),
    exists: data.exists === false ? false : true,
  };
}

export function ProjectSelector() {
  const { projects, setProjects, activeProject, setActiveProject } = useProject();
  const hasProjects = projects.length > 0;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const result = await api.listProjects();
        if (!mounted) return;
        const parsed = (result.projects ?? []).map(toProject).filter(Boolean) as Project[];
        setProjects(parsed);
        if (!activeProject && parsed.length > 0) {
          setActiveProject(parsed[0]);
        }
      } catch {
        if (!mounted) return;
        setProjects([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeProject, setActiveProject, setProjects]);

  const activeDescription = useMemo(
    () => activeProject?.description?.trim() || "project selected",
    [activeProject],
  );

  return (
    <div className="h-14 px-2 py-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">ACTIVE PROJECT</p>
      {!hasProjects ? (
        <div className="mt-1 flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-amber)]" />
          <span className="font-mono text-[11px] text-[var(--accent-amber)]">Select project</span>
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="mt-1">
          <Select
            value={activeProject?.slug ?? ""}
            onValueChange={(slug) => {
              const project = projects.find((item) => item.slug === slug);
              if (project) setActiveProject(project);
            }}
          >
            <SelectTrigger className="h-8 border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 font-mono text-[11px] text-[var(--accent-amber)]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {projects.map((project) => (
                <SelectItem key={project.slug} value={project.slug} className="font-mono text-[11px] text-[var(--text-primary)]">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeProject ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-muted)]">{activeDescription}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
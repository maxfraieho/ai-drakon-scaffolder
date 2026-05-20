import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export interface ProjectGithub {
  owner: string;
  repo: string;
  branch: string;
}

export interface Project {
  slug: string;
  name: string;
  path?: string;
  description: string;
  hasDrakonIr: boolean;
  hasDocs: boolean;
  exists: boolean;
  github?: ProjectGithub;
}

interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  projects: Project[];
  loadProjects: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "ai_drakon_active_project";

const ProjectContext = createContext<ProjectContextValue | null>(null);

function toProject(input: unknown): Project | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  const slug = typeof d.slug === "string" ? d.slug : "";
  if (!slug) return null;
  let github: ProjectGithub | undefined;
  if (d.github && typeof d.github === "object") {
    const g = d.github as Record<string, unknown>;
    if (typeof g.owner === "string" && typeof g.repo === "string") {
      github = { owner: g.owner, repo: g.repo, branch: typeof g.branch === "string" ? g.branch : "main" };
    }
  }
  return {
    slug,
    name: typeof d.name === "string" ? d.name : slug,
    path: typeof d.path === "string" ? d.path : undefined,
    description: typeof d.description === "string" ? d.description : "",
    hasDrakonIr: Boolean(d.hasDrakonIr),
    hasDocs: Boolean(d.hasDocs),
    exists: d.exists === false ? false : true,
    github,
  };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  const setActiveProject = useCallback((p: Project | null) => {
    setActiveProjectState(p);
    if (p) {
      localStorage.setItem(STORAGE_KEY, p.slug);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listProjects();
      const parsed = ((result.projects ?? []) as unknown[]).map(toProject).filter(Boolean) as Project[];
      setProjects(parsed);
      const savedSlug = localStorage.getItem(STORAGE_KEY);
      const saved = savedSlug ? parsed.find((p) => p.slug === savedSlug) : null;
      setActiveProjectState((prev) => {
        if (prev) {
          const updated = parsed.find((p) => p.slug === prev.slug);
          return updated ?? prev;
        }
        return saved ?? parsed[0] ?? null;
      });
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, projects, loadProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}

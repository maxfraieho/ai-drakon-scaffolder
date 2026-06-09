import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from
"react";
import { api } from "@/lib/api";
import { listProjectsArch } from '@/lib/graph-pipeline-api';

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
  addLocalProject: (p: Project) => void;
  removeLocalProject: (slug: string) => void;
}

const STORAGE_KEY = "ai_drakon_active_project";
const LOCAL_PROJECTS_KEY = "ai_drakon_local_projects";

function loadLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch { return []; }
}

function saveLocalProjects(list: Project[]) {
  try { localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list)); } catch {}
}

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
github = { owner: g.owner, repo: g.repo, branch: typeof g.branch === "string" ? g.branch :
"main" };
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
    try {
      localStorage.setItem(STORAGE_KEY + "_data", JSON.stringify(p));
    } catch {}
  } else {
    localStorage.removeItem(STORAGE_KEY);
    try {
      localStorage.removeItem(STORAGE_KEY + "_data");
    } catch {}
  }
}, []);

const loadProjects = useCallback(async () => {
  setLoading(true);
  try {
    const result = await listProjectsArch();
    const configured = result.filter((p) => p.github?.owner || p.repo_url);
    const parsed = configured.map((p) => {
      let github: Project["github"];
      // Пріоритет: github поле з API (новий підхід) > парсинг repo_url (старий)
      if (p.github?.owner && p.github?.repo) {
        github = { owner: p.github.owner, repo: p.github.repo, branch: p.github.branch || p.branch || "main" };
      } else if (p.repo_url) {
        try {
          const u = new URL(p.repo_url);
          const parts = u.pathname.replace(/^\//, "").split("/");
          if (parts.length >= 2) {
            github = { owner: parts[0], repo: parts[1], branch: p.branch || "main" };
          }
        } catch {}
      }
      return {
        slug: p.slug,
        name: p.name,
        description: p.description,
        hasDrakonIr: p.agents.length > 0,
        hasDocs: false,
        exists: true,
        github,
      };
    });
    
    const localList = loadLocalProjects();
    const merged = [
      ...parsed,
      ...localList.filter(lp => !parsed.find(wp => wp.slug === lp.slug))
    ];
    setProjects(merged);
    
    const savedSlug = localStorage.getItem(STORAGE_KEY);
    const saved = savedSlug ? merged.find((p) => p.slug === savedSlug) : null;
    
    // Attempt fallback from serialized localStorage data if not found in merged array
    let fallbackActive: Project | null = null;
    if (savedSlug && !saved) {
      try {
        const cachedData = localStorage.getItem(STORAGE_KEY + "_data");
        if (cachedData) {
          const parsedCached = JSON.parse(cachedData) as Project;
          if (parsedCached && parsedCached.slug === savedSlug) {
            fallbackActive = parsedCached;
          }
        }
      } catch {}
    }

    setActiveProjectState((prev) => {
      if (prev) {
        const updated = merged.find((p) => p.slug === prev.slug);
        return updated ?? fallbackActive ?? null;
      }
      return saved ?? fallbackActive ?? null;
    });
  } catch (err) {
    console.error("Failed to load projects:", err);
    const localList = loadLocalProjects();
    setProjects(localList);
    // Load cached active project as a fallback on failure
    try {
      const cachedData = localStorage.getItem(STORAGE_KEY + "_data");
      if (cachedData) {
        const parsedCached = JSON.parse(cachedData) as Project;
        if (parsedCached) {
          setActiveProjectState(parsedCached);
          if (!localList.find(p => p.slug === parsedCached.slug)) {
            setProjects([...localList, parsedCached]);
          }
        }
      }
    } catch {}
  } finally {
    setLoading(false);
  }
}, []);

const addLocalProject = useCallback((p: Project) => {
  const list = loadLocalProjects();
  if (!list.find(x => x.slug === p.slug)) {
    saveLocalProjects([...list, p]);
  }
  setProjects(prev => prev.find(x => x.slug === p.slug) ? prev : [...prev, p]);
}, []);

const removeLocalProject = useCallback((slug: string) => {
  const list = loadLocalProjects().filter(x => x.slug !== slug);
  saveLocalProjects(list);
  setProjects(prev => prev.filter(x => x.slug !== slug));
  setActiveProjectState(prev => prev?.slug === slug ? null : prev);
}, []);

useEffect(() => {
  void loadProjects();
}, [loadProjects]);

return (
  <ProjectContext.Provider
    value={{
      activeProject,
      setActiveProject,
      projects,
      loadProjects,
      loading,
      addLocalProject,
      removeLocalProject,
    }}
  >
    {children}
  </ProjectContext.Provider>
);
}

export function useProject() {
const ctx = useContext(ProjectContext);
if (!ctx) throw new Error("useProject must be used within ProjectProvider");
return ctx;
}


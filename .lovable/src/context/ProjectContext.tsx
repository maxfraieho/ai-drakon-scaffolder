import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { loadUserConfig, saveUserConfig, writeExtraSettings } from "@/lib/user-config-api";
import { listProjectsArch } from '@/lib/graph-pipeline-api';
import { useAuth } from "@/context/AuthContext";
import { isOnboarded } from "@/lib/onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { DEMO_PROJECT } from "@/lib/onboarding-demo";
import { readSettings, writeSettings } from "@/lib/settings-storage";

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

function loadLocalProjectsFor(uid: string): Project[] {
  try {
    const raw = localStorage.getItem(`ai_drakon_local_projects_${uid}`);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch { return []; }
}

function saveLocalProjectsFor(uid: string, list: Project[]) {
  try { localStorage.setItem(`ai_drakon_local_projects_${uid}`, JSON.stringify(list)); } catch {}
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [useSandbox, setUseSandbox] = useState(false);
  const { user } = useAuth();
  const userId = user?.$id ?? "anon";

  const setActiveProject = useCallback((p: Project | null) => {
    setActiveProjectState(p);
    if (p) {
      localStorage.setItem(`ai_drakon_active_project_${userId}`, p.slug);
      try {
        localStorage.setItem(`ai_drakon_active_project_${userId}_data`, JSON.stringify(p));
      } catch {}
    } else {
      localStorage.removeItem(`ai_drakon_active_project_${userId}`);
      try {
        localStorage.removeItem(`ai_drakon_active_project_${userId}_data`);
      } catch {}
    }

    // Synchronize active project and settings to MinIO
    try {
      const localList = loadLocalProjectsFor(userId);
      saveUserConfig({
        localProjects: localList.filter(x => !x.exists || x.github),
        activeProjectSlug: p ? p.slug : null,
        settings: readSettings()
      });
    } catch {}
  }, [userId]);

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
      
      const localList = loadLocalProjectsFor(userId);
      let merged = [
        ...parsed,
        ...localList.filter(lp => !parsed.find(wp => wp.slug === lp.slug))
      ];
      // Load user config from MinIO and merge local projects
      const remoteConfig = await loadUserConfig().catch(() => null);
      
      // Load remote settings if available
      if (remoteConfig?.settings) {
        try {
          const localSettings = readSettings();
          if (JSON.stringify(localSettings) !== JSON.stringify(remoteConfig.settings)) {
            writeSettings(remoteConfig.settings);
          }
        } catch {}
      }

      // Load remote extraSettings if available
      if (remoteConfig?.extraSettings) {
        try {
          writeExtraSettings(remoteConfig.extraSettings);
        } catch {}
      }

      if (remoteConfig?.localProjects?.length) {
        const remoteProjects = remoteConfig.localProjects.filter(
          rp => !merged.find(mp => mp.slug === rp.slug)
        );
        if (remoteProjects.length > 0) {
          const mergedWithRemote = [...merged, ...remoteProjects];
          saveLocalProjectsFor(userId, mergedWithRemote.filter(p => !parsed.find(wp => wp.slug === p.slug)));
          merged = mergedWithRemote;
        }
      }
      setProjects(merged);
      if (merged.length === 0 && !isOnboarded(userId)) {
        setShowOnboarding(true);
      }
      
      const savedSlug = localStorage.getItem(`ai_drakon_active_project_${userId}`) || remoteConfig?.activeProjectSlug || null;
      const saved = savedSlug ? merged.find((p) => p.slug === savedSlug) : null;
      
      // Attempt fallback from serialized localStorage data if not found in merged array
      let fallbackActive: Project | null = null;
      if (savedSlug && !saved) {
        try {
          const cachedData = localStorage.getItem(`ai_drakon_active_project_${userId}_data`);
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
      const localList = loadLocalProjectsFor(userId);
      setProjects(localList);
      // Load cached active project as a fallback on failure
      try {
        const cachedData = localStorage.getItem(`ai_drakon_active_project_${userId}_data`);
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
  }, [userId]);

  const addLocalProject = useCallback((p: Project) => {
    const list = loadLocalProjectsFor(userId);
    const updated = list.find(x => x.slug === p.slug) ? list : [...list, p];
    if (!list.find(x => x.slug === p.slug)) {
      saveLocalProjectsFor(userId, updated);
    }
    setProjects(prev => {
      const next = prev.find(x => x.slug === p.slug) ? prev : [...prev, p];
      saveUserConfig({
        localProjects: next.filter(x => !x.exists || x.github),
        activeProjectSlug: activeProject?.slug || null,
        settings: readSettings()
      });
      return next;
    });
  }, [userId, activeProject]);

  const removeLocalProject = useCallback((slug: string) => {
    const list = loadLocalProjectsFor(userId).filter(x => x.slug !== slug);
    saveLocalProjectsFor(userId, list);
    setProjects(prev => {
      const next = prev.filter(x => x.slug !== slug);
      saveUserConfig({
        localProjects: next.filter(x => !x.exists || x.github),
        activeProjectSlug: activeProject?.slug === slug ? null : (activeProject?.slug || null),
        settings: readSettings()
      });
      return next;
    });
    setActiveProjectState(prev => prev?.slug === slug ? null : prev);
  }, [userId, activeProject]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setProjects([]);
    setActiveProjectState(null);

    if (userId !== "anon") {
      // Clear legacy unscoped keys (pre-TASK-222) and anonymous session
      [
        "ai_drakon_active_project",
        "ai_drakon_active_project_data",
        "ai_drakon_local_projects",
        "ai_drakon_active_project_anon",
        "ai_drakon_active_project_anon_data",
        "ai_drakon_local_projects_anon",
      ].forEach(k => localStorage.removeItem(k));
    }
  }, [userId]);

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
      {showOnboarding && (
        <OnboardingWizard
          userId={userId}
          onComplete={() => setShowOnboarding(false)}
          onSandbox={() => {
            setShowOnboarding(false);
            setUseSandbox(true);
            addLocalProject(DEMO_PROJECT);
            setActiveProject(DEMO_PROJECT);
          }}
        />
      )}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}


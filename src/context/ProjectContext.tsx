import { createContext, useContext, useState, type ReactNode } from "react";

export interface Project {
  slug: string;
  name: string;
  description: string;
  hasDrakonIr: boolean;
  hasDocs: boolean;
  exists: boolean;
}

interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (p: Project) => void;
  projects: Project[];
  setProjects: (ps: Project[]) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, projects, setProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
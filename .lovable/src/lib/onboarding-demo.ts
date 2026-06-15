import type { Project } from "@/context/ProjectContext";

export const DEMO_PROJECT: Project = {
  slug: "demo-sandbox",
  name: "ThreatClassifier (демо)",
  description: "Демо-схема: класифікатор загроз з DRAKON IR. Readonly, компілюється на платформній квоті.",
  hasDrakonIr: true,
  hasDocs: false,
  exists: true,
  github: {
    owner: "demo",
    repo: "demo-sandbox",
    branch: "main"
  }
};

import {
  Braces,
  LayoutDashboard,
  Layers,
  BookOpen,
  GitPullRequest,
  Code2,
  Activity,
  Cpu,
  Cog,
  type LucideIcon,
} from "lucide-react";

export interface AstryxNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  section: "workspace" | "system";
  headerVisible?: boolean;
}

export const ASTRYX_NAV_ITEMS: AstryxNavItem[] = [
  {
    id: "workspace",
    label: "Робоча область",
    path: "/workspace",
    icon: Braces,
    section: "workspace",
    headerVisible: true,
  },
  {
    id: "diagrams",
    label: "Схеми ДРАКОН",
    path: "/diagrams",
    icon: LayoutDashboard,
    section: "workspace",
    headerVisible: true,
  },
  {
    id: "architect",
    label: "Architect",
    path: "/architect",
    icon: Layers,
    section: "workspace",
    headerVisible: true,
  },
  {
    id: "notebooks",
    label: "NotebookLM",
    path: "/notebooks",
    icon: BookOpen,
    section: "workspace",
    headerVisible: true,
  },
  {
    id: "pipelines",
    label: "Pipelines",
    path: "/pipelines",
    icon: GitPullRequest,
    section: "workspace",
    headerVisible: true,
  },
  {
    id: "codegen",
    label: "Codegen",
    path: "/codegen",
    icon: Code2,
    section: "workspace",
    headerVisible: false,
  },
  {
    id: "trace",
    label: "Execution Trace",
    path: "/trace",
    icon: Activity,
    section: "workspace",
    headerVisible: false,
  },
  {
    id: "agents",
    label: "Агенти",
    path: "/agents",
    icon: Cpu,
    section: "system",
    headerVisible: true,
  },
  {
    id: "settings",
    label: "Налаштування",
    path: "/settings",
    icon: Cog,
    section: "system",
    headerVisible: false,
  },
];

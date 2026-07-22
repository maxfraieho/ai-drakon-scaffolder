import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  GitPullRequest,
  Code2,
  Activity,
  Cpu,
  Cog,
  Braces,
} from "lucide-react";

export const AstryxSideNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="flex flex-col gap-4 p-3 font-sans text-xs">
      {/* Workspace Section */}
      <div className="flex flex-col gap-1">
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--astryx-text-muted)]">
          Робочий простір
        </span>
        <Link
          to="/workspace"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/workspace") ? "selected" : ""}`}
        >
          <Braces className="h-3.5 w-3.5" />
          <span>Робоча область</span>
        </Link>
        <Link
          to="/diagrams"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/diagrams") ? "selected" : ""}`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Схеми ДРАКОН</span>
        </Link>
        <Link
          to="/architect"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/architect") ? "selected" : ""}`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Architect</span>
        </Link>
        <Link
          to="/notebooks"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/notebooks") ? "selected" : ""}`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>NotebookLM</span>
        </Link>
        <Link
          to="/pipelines"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/pipelines") ? "selected" : ""}`}
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          <span>Pipelines</span>
        </Link>
        <Link
          to="/codegen"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/codegen") ? "selected" : ""}`}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Codegen</span>
        </Link>
        <Link
          to="/trace"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/trace") ? "selected" : ""}`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Execution Trace</span>
        </Link>
      </div>

      {/* System Section */}
      <div className="flex flex-col gap-1">
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--astryx-text-muted)]">
          Система та Агенти
        </span>
        <Link
          to="/agents"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/agents") ? "selected" : ""}`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Агенти</span>
        </Link>
        <Link
          to="/settings"
          className={`astryx-top-nav-item flex items-center gap-2 ${isActive("/settings") ? "selected" : ""}`}
        >
          <Cog className="h-3.5 w-3.5" />
          <span>Налаштування</span>
        </Link>
      </div>
    </nav>
  );
};

import React from "react";
import { Link as NavLink } from "@tanstack/react-router";
import { Workflow, Bot, GitMerge, BookOpen, Home, Code2 } from "lucide-react";
import { useProject } from "@/context/ProjectContext";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  params?: Record<string, string>;
}

export const MobileNavigationDock: React.FC = () => {
  const { activeProject } = useProject();
  const items: NavItem[] = [
    { label: "Diagrams", icon: Workflow, to: "/diagrams" },
    { label: "Agents", icon: Bot, to: "/agents" },
    { label: "Pipelines", icon: GitMerge, to: "/pipelines" },
    { label: "Codegen", icon: Code2, to: "/codegen" },
    activeProject
      ? { label: "Docs", icon: BookOpen, to: "/p/$slug/docs", params: { slug: activeProject.slug } }
      : { label: "Docs", icon: BookOpen, to: "/workspace" },
    { label: "Home", icon: Home, to: "/" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 pb-safe md:hidden">
      <div className="flex items-center h-16 max-w-md mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to as any}
              params={item.params as any}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-indigo-400" }}
              inactiveProps={{ className: "text-zinc-500" }}
              className="relative flex-1 min-w-0 flex flex-col items-center justify-center h-12 transition-colors"
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-1 font-medium select-none">{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

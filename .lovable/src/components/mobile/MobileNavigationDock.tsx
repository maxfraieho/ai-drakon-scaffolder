import React from "react";
import { LayoutGrid, FileText, Code2, Cpu, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export const MobileNavigationDock: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { id: "overview",  label: "Огляд",   icon: LayoutGrid, path: "/overview" },
    { id: "pipelines", label: "Схеми",   icon: FileText,   path: "/pipelines" },
    { id: "code",      label: "Код",     icon: Code2,      path: "/code" },
    { id: "agents",    label: "Агенти",  icon: Cpu,        path: "/agents" },
    { id: "settings",  label: "Опції",   icon: Settings,   path: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-lg border-t border-zinc-800 pb-safe md:hidden">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={"relative flex flex-col items-center justify-center w-14 h-12 transition-colors " + (isActive ? "text-white" : "text-zinc-400 hover:text-zinc-100")}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium select-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

import { ComponentType, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { 
  Bot, 
  Workflow, 
  GitMerge, 
  BookOpen, 
  Brain, 
  Notebook, 
  Settings, 
  Menu, 
  X,
  Activity,
  Building2
} from "lucide-react";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<any>;
  hasStatus?: boolean;
}

export function AppLayout() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [
    { to: "/diagrams", label: "Diagrams", icon: Workflow },
    { to: "/agents", label: "Agents", icon: Bot, hasStatus: true },
    { to: "/pipelines", label: "Pipelines", icon: GitMerge },
    { to: "/docs", label: "Docs", icon: BookOpen },
    { to: "/knowledge", label: "Knowledge", icon: Brain },
    { to: "/architect", label: "Architect", icon: Building2 },
    { to: "/notebooks", label: "Notebooks", icon: Notebook },
    { to: "/observability", label: "Observability", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800/80 backdrop-blur-md sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
            aria-label="Open Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              AI Drakon
            </span>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800/80
          flex flex-col transform transition-transform duration-300 ease-in-out
          md:relative md:transform-none md:flex
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="h-4 w-4 text-white animate-pulse" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              AI Drakon
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
            aria-label="Close Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                {item.hasStatus && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `
              p-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors flex items-center justify-center
              ${isActive ? "text-indigo-400 bg-indigo-600/10 border border-indigo-500/20" : ""}
            `}
            title="Settings"
          >
            <Settings className="h-5 w-5 animate-[spin_8s_linear_infinite]" />
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-zinc-950">
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { BookOpen, Bot, LayoutDashboard, Package, Settings, Workflow } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ProjectMode = "agent" | "playpipe" | "n8n";

type ProjectSidebarProps = {
  slug: string;
  mode?: ProjectMode;
  loading?: boolean;
};

type NavItem = {
  key: string;
  label: string;
  to: "/p/$slug/overview" | "/p/$slug/docs" | "/p/$slug/settings" | "/p/$slug/agents" | "/p/$slug/playpipe" | "/p/$slug/automations";
  icon: typeof LayoutDashboard;
};

function getNavItems(mode?: ProjectMode): NavItem[] {
  const base: NavItem[] = [
    { key: "overview", label: "Overview", to: "/p/$slug/overview", icon: LayoutDashboard },
  ];

  if (mode === "agent") {
    base.push({ key: "agents", label: "Agents", to: "/p/$slug/agents", icon: Bot });
  }

  if (mode === "playpipe") {
    base.push({ key: "playpipe", label: "PlayPipe", to: "/p/$slug/playpipe", icon: Package });
    base.push({ key: "agents", label: "Agents", to: "/p/$slug/agents", icon: Bot });
  }

  if (mode === "n8n") {
    base.push({ key: "automations", label: "Automations", to: "/p/$slug/automations", icon: Workflow });
  }

  base.push({ key: "docs", label: "Docs", to: "/p/$slug/docs", icon: BookOpen });
  base.push({ key: "settings", label: "Settings", to: "/p/$slug/settings", icon: Settings });

  return base;
}

export function ProjectSidebar({ slug, mode, loading = false }: ProjectSidebarProps) {
  const items = getNavItems(mode);

  if (loading) {
    return (
      <aside className="hidden h-full w-60 shrink-0 border-r border-white/10 bg-slate-950/40 p-4 md:block">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-24 bg-white/10" />
          <Skeleton className="h-8 w-full bg-white/10" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/10" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="hidden h-full w-60 shrink-0 border-r border-white/10 bg-slate-950/40 p-4 backdrop-blur-xl md:block">
        <p className="mb-4 px-2 font-[Outfit] text-xs uppercase tracking-[0.2em] text-slate-400">Project hub</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.to}
                params={{ slug }}
                className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-300 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white"
                activeProps={{
                  className:
                    "border-indigo-400/30 bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15),0_0_20px_rgba(79,70,229,0.2)]",
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/85 px-2 py-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={`mobile-${item.key}`}
                to={item.to}
                params={{ slug }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-slate-400 transition-colors",
                  "hover:bg-white/5 hover:text-white",
                )}
                activeProps={{ className: "bg-indigo-500/15 text-indigo-200" }}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

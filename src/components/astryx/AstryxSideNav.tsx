import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ASTRYX_NAV_ITEMS } from "./astryx-nav-config";

export const AstryxSideNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const workspaceItems = ASTRYX_NAV_ITEMS.filter((item) => item.section === "workspace");
  const systemItems = ASTRYX_NAV_ITEMS.filter((item) => item.section === "system");

  return (
    <nav className="flex flex-col gap-4 p-3 font-sans text-xs">
      {/* Workspace Section */}
      <div className="flex flex-col gap-1">
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--astryx-text-muted)]">
          Робочий простір
        </span>
        {workspaceItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`astryx-top-nav-item flex items-center gap-2 ${isActive(item.path) ? "selected" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* System Section */}
      <div className="flex flex-col gap-1">
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--astryx-text-muted)]">
          Система та Агенти
        </span>
        {systemItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`astryx-top-nav-item flex items-center gap-2 ${isActive(item.path) ? "selected" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

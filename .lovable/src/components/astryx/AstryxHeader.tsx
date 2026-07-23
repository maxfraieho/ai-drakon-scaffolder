import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Terminal, Moon, Sun, Search, Bot, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ASTRYX_NAV_ITEMS } from "./astryx-nav-config";

interface AstryxHeaderProps {
  onOpenCmd: () => void;
  onOpenAgentChat?: () => void;
  onLogout?: () => void;
}

export const AstryxHeader: React.FC<AstryxHeaderProps> = ({
  onOpenCmd,
  onOpenAgentChat,
  onLogout,
}) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isNavActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="astryx-app-shell-header">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <Link to="/" className="astryx-top-nav-heading">
          <span className="flex items-center justify-center h-7 w-7 rounded-md bg-[var(--astryx-color-brand-light)] text-[var(--astryx-color-brand)] font-bold">
            <Terminal className="h-4 w-4" />
          </span>
          <span>AI-DRAKON Studio</span>
        </Link>
        <span className="astryx-badge primary">Astryx Framework</span>
      </div>

      {/* Top Nav Items */}
      <nav className="hidden md:flex items-center gap-1">
        {ASTRYX_NAV_ITEMS.filter((item) => item.headerVisible !== false).map(
          (item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`astryx-top-nav-item ${isNavActive(item.path) ? "selected" : ""}`}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCmd}
          className="astryx-button ghost sm border border-[var(--astryx-border-subtle)]"
          aria-label="Search Command Palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] opacity-70">⌘K</span>
        </button>

        {onOpenAgentChat && (
          <button
            type="button"
            onClick={onOpenAgentChat}
            className="astryx-button ghost sm"
            aria-label="Agent Chat"
          >
            <Bot className="h-3.5 w-3.5 text-[var(--astryx-color-brand)]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="astryx-button ghost sm"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="astryx-button ghost sm text-red-500 hover:bg-red-500/10"
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};

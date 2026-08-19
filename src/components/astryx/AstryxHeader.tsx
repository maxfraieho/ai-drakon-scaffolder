import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Terminal, Moon, Sun, Search, Bot, LogOut, Menu } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ASTRYX_NAV_ITEMS } from "./astryx-nav-config";

interface AstryxHeaderProps {
  onOpenCmd: () => void;
  onOpenAgentChat?: () => void;
  onOpenMobileNav?: () => void;
  onLogout?: () => void;
}

export const AstryxHeader: React.FC<AstryxHeaderProps> = ({
  onOpenCmd,
  onOpenAgentChat,
  onOpenMobileNav,
  onLogout,
}) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isNavActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="astryx-app-shell-header">
      {/* Brand & Logo + Mobile Nav Trigger */}
      <div className="flex items-center gap-2">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden astryx-button ghost sm"
            aria-label="Відкрити навігацію"
            data-variant="ghost"
            data-size="sm"
            data-testid="astryx-mobile-nav-toggle"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <Link to="/" className="astryx-top-nav-heading" data-testid="astryx-header-brand">
          <span className="flex items-center justify-center h-7 w-7 rounded-md bg-[var(--astryx-color-brand-light)] text-[var(--astryx-color-brand)] font-bold">
            <Terminal className="h-4 w-4" />
          </span>
          <span>AI-DRAKON Studio</span>
        </Link>
      </div>

      {/* Top Nav Items */}
      <nav aria-label="Верхня навігація" className="hidden md:flex items-center gap-1">
        {ASTRYX_NAV_ITEMS.filter((item) => item.headerVisible !== false).map(
          (item) => (
            <Link
              key={item.id}
              to={item.path}
              data-variant="ghost"
              data-size="sm"
              data-testid={`astryx-top-nav-item-${item.id}`}
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
          data-variant="ghost"
          data-size="sm"
          data-testid="astryx-header-search-btn"
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
            data-variant="ghost"
            data-size="sm"
            data-testid="astryx-header-agent-chat-btn"
          >
            <Bot className="h-3.5 w-3.5 text-[var(--astryx-color-brand)]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="astryx-button ghost sm"
          aria-label="Toggle Theme"
          data-variant="ghost"
          data-size="sm"
          data-testid="astryx-header-theme-toggle-btn"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="astryx-button ghost sm text-red-500 hover:bg-red-500/10"
            aria-label="Logout"
            data-variant="ghost"
            data-size="sm"
            data-testid="astryx-header-logout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readSettings, writeSettings } from '@/lib/settings-storage';

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const isDark =
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      : theme === "dark";

  const resolved = isDark ? "dark" : "light";
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-astryx-theme", isDark ? "dark" : "astryx");
  root.classList.toggle("dark", isDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return readSettings().app.theme ?? "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    applyThemeToDOM(theme);

    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        applyThemeToDOM("system");
      };

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
      } else if (typeof (mediaQuery as any).addListener === "function") {
        (mediaQuery as any).addListener(handleChange);
        return () => (mediaQuery as any).removeListener(handleChange);
      }
    }
  }, [theme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    try {
      const s = readSettings();
      writeSettings({ ...s, app: { ...s.app, theme: next } });
    } catch {}
    applyThemeToDOM(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

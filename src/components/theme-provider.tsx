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
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-astryx-theme", resolved === "dark" ? "dark" : "astryx");
  document.documentElement.classList.toggle("dark", resolved === "dark");
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

export type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  return {
    theme: "dark" as ThemeMode,
    setTheme: (_theme: ThemeMode) => {},
  };
}

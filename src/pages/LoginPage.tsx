import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sun, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { readSettings, writeSettings } from "@/lib/settings-storage";

const DEFAULT_WORKER_URL = "https://drakon-mcp-worker.maxfraieho.workers.dev";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const t = readSettings().app.theme;
    return t === "light" ? "light" : "dark";
  });

  // One-time migration: ensure workerUrl is set
  useEffect(() => {
    const settings = readSettings();
    if (!settings.app.workerUrl) {
      writeSettings({
        ...settings,
        app: { ...settings.app, workerUrl: DEFAULT_WORKER_URL },
      });
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const s = readSettings();
    writeSettings({ ...s, app: { ...s.app, theme: next } });
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await api.login(email, password);
      const token = response.token ?? response.jwt;

      if (!token) {
        throw new Error(response.message || response.error || "Невірний email або пароль");
      }

      localStorage.setItem("jwt", token);
      navigate({ to: "/diagrams", replace: true });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Невірний email або пароль");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="absolute top-4 right-4 p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors duration-150 active:scale-[0.96]"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4" aria-hidden="true" />
        )}
      </button>

      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader>
          <CardTitle>Вхід</CardTitle>
          <CardDescription>Увійдіть для роботи зі схемами DRAKON.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <p
                role="alert"
                className="text-sm text-[var(--color-error)]"
              >
                {errorMsg}
              </p>
            )}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Вхід..." : "Увійти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

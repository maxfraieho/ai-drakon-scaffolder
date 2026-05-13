import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readSettings } from "@/lib/settings-storage";
import { setAccessToken } from "@/lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const workerUrl = readSettings().app.workerUrl.replace(/\/+$/, "");
      const resp = await fetch(`${workerUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json().catch(() => ({}) as Record<string, unknown>);
      const token = (data as { token?: string; jwt?: string }).token ?? (data as { jwt?: string }).jwt;
      if (!token) {
        throw new Error(((data as { error?: string }).error) || "Невірний логін або пароль");
      }
      setAccessToken(token);
      // Compatibility: rest of app reads "jwt" localStorage key
      if (typeof window !== "undefined") {
        localStorage.setItem("jwt", token);
      }
      navigate({ to: "/diagrams", replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Невірний логін або пароль");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader>
          <CardTitle>AI-DRAKON</CardTitle>
          <CardDescription>Введіть логін та пароль для входу.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="username">Логін</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg ? (
              <p role="alert" className="text-sm text-[var(--color-error)]">
                {errorMsg}
              </p>
            ) : null}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Вхід..." : "Увійти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

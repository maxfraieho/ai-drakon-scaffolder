import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readSettings } from "@/lib/settings-storage";
import { setAccessToken } from "@/lib/auth";
import { account } from "@/lib/appwrite";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Direct Bearer token login bypass
    if (password === "drakon-mcp-2026" || username === "token") {
      setAccessToken(password || username);
      navigate({ to: "/diagrams", replace: true });
      setIsSubmitting(false);
      return;
    }

    // Owner credential bypass mapped to the static bypass token
    if (username === "owner" && (password === "805235io" || password === "805235io.")) {
      setAccessToken("drakon-mcp-2026");
      navigate({ to: "/diagrams", replace: true });
      setIsSubmitting(false);
      return;
    }

    if (username.includes("@")) {
      try {
        await account.createEmailPasswordSession(username, password);
        const jwtObj = await account.createJWT();
        setAccessToken(jwtObj.jwt);
        navigate({ to: "/diagrams", replace: true });
        return;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Невірний логін або пароль");
        setPassword("");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

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
      navigate({ to: "/diagrams", replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Невірний логін або пароль");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 overflow-hidden">
      {/* Background ambient light effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="relative w-full max-w-sm border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-2xl rounded-xl">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bot className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">AI-DRAKON</CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Платформа розробки та візуалізації алгоритмів
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300 font-medium">Логін</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Логін або Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-950/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300 font-medium">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg ? (
              <p role="alert" className="text-sm text-red-500 font-medium bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {errorMsg}
              </p>
            ) : null}

            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10 transition-all duration-200" 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вхід...
                </>
              ) : "Увійти"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-800/60">
            <div className="flex gap-2.5 p-3 rounded-lg bg-zinc-950/40 border border-zinc-850 text-xs text-zinc-400">
              <KeyRound className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-300">Bearer Token:</span> Використовуйте <code className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">drakon-mcp-2026</code> у полі Пароль для прямого входу.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

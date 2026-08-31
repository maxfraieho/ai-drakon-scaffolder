import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Eye, EyeOff, Loader2, UserPlus, Github } from "lucide-react";
import { ID, OAuthProvider } from "appwrite";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readSettings } from "@/lib/settings-storage";
import { setAccessToken } from "@/lib/auth";
import { account } from "@/lib/appwrite";
import { useAuth } from "@/context/AuthContext";

function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const NODE_COUNT = 90;
    const CONNECT_DIST = 200;
    const EXCLUSION_RADIUS = 170;

    interface Node {
      x: number; y: number; vx: number; vy: number;
      r: number; opacity: number; hub: boolean;
    }
    const nodes: Node[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnNode = (): Node => {
      const isHub = Math.random() < 0.15;
      let x: number, y: number;
      do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
      } while (
        Math.sqrt((x - canvas.width / 2) ** 2 + (y - canvas.height / 2) ** 2) < EXCLUSION_RADIUS
      );
      return {
        x, y,
        vx: (Math.random() - 0.5) * (isHub ? 0.12 : 0.35),
        vy: (Math.random() - 0.5) * (isHub ? 0.12 : 0.35),
        r: isHub ? Math.random() * 3.5 + 3.5 : Math.random() * 2 + 1,
        opacity: isHub ? Math.random() * 0.3 + 0.5 : Math.random() * 0.25 + 0.2,
        hub: isHub,
      };
    };

    for (let i = 0; i < NODE_COUNT; i++) nodes.push(spawnNode());

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const bothHub = nodes[i].hub && nodes[j].hub;
            const anyHub = nodes[i].hub || nodes[j].hub;
            const alpha = (1 - dist / CONNECT_DIST) * (bothHub ? 0.4 : anyHub ? 0.25 : 0.12);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = bothHub ? 1.5 : anyHub ? 0.8 : 0.4;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        if (n.hub) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 158, 11, ${n.opacity * 0.15})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${n.opacity})`;
        ctx.fill();

        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        const distToCenter = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2);
        if (distToCenter < EXCLUSION_RADIUS) {
          const angle = Math.atan2(n.y - cy, n.x - cx);
          n.x = cx + Math.cos(angle) * EXCLUSION_RADIUS;
          n.y = cy + Math.sin(angle) * EXCLUSION_RADIUS;
          n.vx = Math.cos(angle) * Math.abs(n.vx) * 1.2;
          n.vy = Math.sin(angle) * Math.abs(n.vy) * 1.2;
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login: appwriteLogin } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Сервер авторизації не відповідає. Спробуйте ще раз.")), ms)
      ),
    ]);
  };

  const handleGithubLogin = () => {
    // 4th arg = OAuth scopes. Default GitHub OAuth only grants user:email, which
    // cannot list private repos. Request `repo` so providerAccessToken can read
    // the user's repositories in the "Add repository" dialog.
    account.createOAuth2Token(
      OAuthProvider.Github,
      window.location.origin + "/diagrams",
      window.location.origin + "/login",
      ["user:email", "repo", "read:org"]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await account.create(ID.unique(), username, password, name || undefined);
      await withTimeout(appwriteLogin(username, password));
      navigate({ to: "/diagrams", replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Помилка реєстрації");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (username.includes("@")) {
      try {
        await withTimeout(appwriteLogin(username, password));
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
    <div className="astryx-migrated relative flex min-h-screen items-center justify-center bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] px-4 overflow-hidden" data-testid="login-page">
      <NetworkBackground />

      {/* Radial center glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(245,158,11,0.04) 0%, transparent 65%)",
          zIndex: 1,
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm"
        style={{ zIndex: 2 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--astryx-color-brand-light)] border border-[var(--astryx-color-brand)]/20">
            <Bot className="h-7 w-7 text-[var(--astryx-color-brand)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--astryx-text-primary)]">AI-DRAKON</h1>
          <p className="text-[var(--astryx-text-secondary)] text-sm mt-1">Платформа розробки та візуалізації алгоритмів</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-[var(--astryx-radius-md)] border border-[var(--astryx-border-subtle)] overflow-hidden mb-6 bg-[var(--astryx-surface-primary)] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] font-semibold"
                : "text-[var(--astryx-text-secondary)] hover:text-[var(--astryx-text-primary)]"
            }`}
          >
            Увійти
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] font-semibold"
                : "text-[var(--astryx-text-secondary)] hover:text-[var(--astryx-text-primary)]"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 inline mr-1" />
            Реєстрація
          </button>
        </div>

        {/* Form container */}
        <div className="bg-[var(--astryx-surface-primary)] backdrop-blur-md border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-lg)] p-6 space-y-4 shadow-xl">
          {mode === "register" ? (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="space-y-2">
                <label className="text-sm text-[var(--astryx-text-secondary)] font-medium font-sans">Ім'я (необов'язково)</label>
                <Input
                  type="text"
                  placeholder="Ваше ім'я"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] text-[var(--astryx-text-primary)] placeholder:text-[var(--astryx-text-muted)] focus-visible:ring-[var(--astryx-border-focus)]/30 focus-visible:border-[var(--astryx-border-focus)] h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[var(--astryx-text-secondary)] font-medium font-sans">Email</label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] text-[var(--astryx-text-primary)] placeholder:text-[var(--astryx-text-muted)] focus-visible:ring-[var(--astryx-border-focus)]/30 focus-visible:border-[var(--astryx-border-focus)] h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[var(--astryx-text-secondary)] font-medium font-sans">Пароль</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Мінімум 8 символів"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] text-[var(--astryx-text-primary)] placeholder:text-[var(--astryx-text-muted)] focus-visible:ring-[var(--astryx-border-focus)]/30 focus-visible:border-[var(--astryx-border-focus)] h-11 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--astryx-text-muted)] hover:text-[var(--astryx-text-primary)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {errorMsg && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {errorMsg}
                </p>
              )}
              <Button
                className="w-full h-11 bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold transition-all rounded-[var(--astryx-radius-sm)]"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Реєстрація...</> : "Зареєструватися"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm text-[var(--astryx-text-secondary)] font-medium font-sans">Логін або Email</label>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="email@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] text-[var(--astryx-text-primary)] placeholder:text-[var(--astryx-text-muted)] focus-visible:ring-[var(--astryx-border-focus)]/30 focus-visible:border-[var(--astryx-border-focus)] h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[var(--astryx-text-secondary)] font-medium font-sans">Пароль</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] text-[var(--astryx-text-primary)] placeholder:text-[var(--astryx-text-muted)] focus-visible:ring-[var(--astryx-border-focus)]/30 focus-visible:border-[var(--astryx-border-focus)] h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--astryx-text-muted)] hover:text-[var(--astryx-text-primary)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {errorMsg && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {errorMsg}
                </p>
              )}
              <Button
                className="w-full h-11 bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold transition-all rounded-[var(--astryx-radius-sm)]"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Вхід...</> : "Увійти"}
              </Button>
            </form>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[var(--astryx-border-subtle)]"></div>
            <span className="flex-shrink mx-4 text-[var(--astryx-text-muted)] text-xs font-sans">або</span>
            <div className="flex-grow border-t border-[var(--astryx-border-subtle)]"></div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)] text-[var(--astryx-text-primary)] hover:bg-[var(--astryx-surface-elevated)] transition-all font-semibold rounded-[var(--astryx-radius-sm)]"
            onClick={handleGithubLogin}
          >
            <Github className="mr-2 h-4 w-4 text-[var(--astryx-text-primary)]" />
            Увійти через GitHub
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--astryx-text-muted)] text-xs mt-6 tracking-wider uppercase">
          DRAKON Suite · Knowledge Platform
        </p>
      </div>
    </div>
  );
}

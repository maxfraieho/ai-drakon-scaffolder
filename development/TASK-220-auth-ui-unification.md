# TASK-220: Auth UI Unification — DRAKON LoginPage → Bloom Style

**Run locally on AGY3 (Termux). Edit files at: `/data/data/com.termux/files/home/workspace/ai-drakon-scaffolder/`**

---

## Context

Garden Bloom має красивий `AccessGateUI.tsx` з анімованим canvas-графом (`NetworkBackground`) на тлі — вузли з'єднані лініями, hub-вузли з glow, все в тілі teal `rgba(45,212,168,α)`. Це точно та ж палітра що і весь DRAKON Suite.

AI-DRAKON LoginPage (`src/pages/LoginPage.tsx`) виглядає інакше: indigo кольори, статичні blurry circles, Card компонент. Треба привести до єдиного стилю.

## Goal

1. **Перенести `NetworkBackground`** з Bloom у DRAKON LoginPage
2. **Уніфікувати стиль**: teal замість indigo, прибрати Card → чистий glassmorphism
3. **Виправити "Failed to fetch"** при реєстрації

---

## Part 1: Fix Registration — "Failed to fetch"

**Проблема**: `account.create()` викликає Appwrite `fra.cloud.appwrite.io`. Помилка "Failed to fetch" означає що домен не дозволений.

**Перевір і виправ в Appwrite Console** (https://cloud.appwrite.io → Project `6a23420a003a04b4997b`):

1. Auth → Settings → Email/Password → переконайся що **Email/Password signup = ENABLED**
2. Settings → Platforms → Web → перевір чи є `aidrakon.tech` і `localhost` в списку
   - Якщо немає → Add Platform → Web → hostname: `aidrakon.tech`
   - Додай також: `localhost`

Після цього реєстрація повинна працювати без змін у коді.

---

## Part 2: Port NetworkBackground to DRAKON LoginPage

**Файл для редагування:** `src/pages/LoginPage.tsx`

### Крок 1: Додай NetworkBackground компонент

Замість поточного блоку з двома blurry circles (`absolute top-1/4...` і `absolute bottom-1/4...`) — додай цей компонент на початку файлу (перед `export function LoginPage()`):

```tsx
import { useState, useEffect, useRef } from "react";

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
            ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`;
            ctx.lineWidth = bothHub ? 1.5 : anyHub ? 0.8 : 0.4;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        if (n.hub) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(45, 212, 191, ${n.opacity * 0.15})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45, 212, 191, ${n.opacity})`;
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
```

**ВАЖЛИВО**: В імпортах вже є `import { useState } from "react"` — замінити на:
```tsx
import { useState, useEffect, useRef } from "react";
```

### Крок 2: Замінити return JSX у LoginPage

Замінити весь `return (...)` у функції `LoginPage` на:

```tsx
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-950 px-4 overflow-hidden">
      <NetworkBackground />

      {/* Radial center glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(45,212,191,0.04) 0%, transparent 65%)",
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 border border-teal-400/20">
            <Bot className="h-7 w-7 text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">AI-DRAKON</h1>
          <p className="text-gray-400 text-sm mt-1">Платформа розробки та візуалізації алгоритмів</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-xl border border-white/10 overflow-hidden mb-6 bg-white/5 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-teal-500 text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Увійти
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-teal-500 text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 inline mr-1" />
            Реєстрація
          </button>
        </div>

        {/* Form container */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
          {mode === "register" ? (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 font-medium">Ім'я (необов'язково)</label>
                <Input
                  type="text"
                  placeholder="Ваше ім'я"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-teal-400/30 focus-visible:border-teal-400/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 font-medium">Email</label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-teal-400/30 focus-visible:border-teal-400/50 h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 font-medium">Пароль</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Мінімум 8 символів"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-teal-400/30 focus-visible:border-teal-400/50 h-11 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                className="w-full h-11 bg-teal-500 hover:bg-teal-400 text-black font-semibold transition-all"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Реєстрація...</> : "Зареєструватися"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 font-medium">Логін або Email</label>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="email@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-teal-400/30 focus-visible:border-teal-400/50 h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 font-medium">Пароль</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-teal-400/30 focus-visible:border-teal-400/50 h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                className="w-full h-11 bg-teal-500 hover:bg-teal-400 text-black font-semibold transition-all"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Вхід...</> : "Увійти"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6 tracking-wider uppercase">
          DRAKON Suite · Knowledge Platform
        </p>
      </div>
    </div>
  );
```

### Крок 3: Синхронізуй з .lovable/

```bash
cp src/pages/LoginPage.tsx .lovable/src/pages/LoginPage.tsx
```

### Крок 4: Перевірка TypeScript

```bash
cd ~/workspace/ai-drakon-scaffolder
npx tsc --noEmit 2>&1 | head -20
```

Якщо є помилки — виправ. Найчастіша: `useEffect` і `useRef` не імпортовані.

### Крок 5: Commit + Push

```bash
git add src/pages/LoginPage.tsx .lovable/src/pages/LoginPage.tsx development/TASKS.md
git commit -m "feat(auth): port NetworkBackground from Bloom to DRAKON LoginPage, teal theme"
git push origin main
```

---

## Verification

Після деплою на aidrakon.tech/login:
- [ ] Анімований граф видно на фоні
- [ ] Форма не перекривається графом (exclusion zone)
- [ ] Tabs "Увійти" / "Реєстрація" активні з teal кольором
- [ ] Реєстрація не показує "Failed to fetch" (Appwrite Console фікс)
- [ ] Вхід з email/password працює
- [ ] Вхід через Bearer token `drakon-mcp-2026` в полі пароль — залишається (в handleLogin він є)

---

## Diary entry

```
SESSION:2026-06-13|TASK-220:auth-ui-unification|LoginPage NetworkBackground+teal+Appwrite fix|commit:<hash>|★★★
```

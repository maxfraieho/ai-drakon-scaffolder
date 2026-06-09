# AGY TASK SPRINT — UI Bug Fix
**Дата:** 2026-06-09 | **Агент:** AGY3 | **Пріоритет:** HIGH
**Репо:** ~/workspace/ai-drakon-scaffolder
**Сайт:** https://aidrakon.tech

---

## КОНТЕКСТ (прочитай перед стартом)

Агенти вже перенесені на Flue / Cloudflare Workers:
- `https://architect-agent-flue.maxfraieho.workers.dev`
- `https://drakon-agent-flue.maxfraieho.workers.dev`
- `https://docs-agent-flue.maxfraieho.workers.dev`

**Проблеми зі скріншотів:**
1. Всі агенти — червоні (offline), помилка "тимчасово недоступний"
2. GitHub токен зберігається, але зникає після повторного логіну
3. Список проектів порожній — не можна вибрати існуючий, тільки "Додати новий"
4. `/docs` — помилка "Не вдалося завантажити файл з GitHub"
5. Назва діаграми: "SlotRouter **â** score_candidate..." — encoding bug
6. Агент показує: `OpenAI · drakon-assistant-proxy → модель невідома`

---

## STEP 0 — Підготовка

```bash
cd ~/workspace/ai-drakon-scaffolder
git pull origin main
echo "=== Поточний стан ===" 
git log --oneline -5
```

GitNexus — швидкий контекст:
```bash
curl -s -X POST https://gitnexus.exodus.pp.ua/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"query":"settings-storage auth token GitHub persistence login","repo":"ai-drakon-scaffolder"}}}' \
  | grep '^data:' | python3 -c "import sys,json; [print(json.loads(l[5:]).get('result',{}).get('content',[{}])[0].get('text','')[:2000]) for l in sys.stdin]" 2>/dev/null
```

---

## TASK-190: GitHub токен зникає після повторного логіну

### Діагностика
```bash
cat src/lib/settings-storage.ts
cat src/lib/auth.ts
grep -n "token\|github\|PAT\|clearSettings\|removeItem\|localStorage" \
  src/lib/auth.ts src/lib/settings-storage.ts src/pages/LoginPage.tsx \
  src/context/AuthContext.tsx 2>/dev/null | head -60
```

### Проблема (очікувана)
При logout або re-login викликається `localStorage.clear()` або `removeItem` на всі ключі,
що знищує збережений GitHub PAT разом з auth-токеном.

### Fix — `src/lib/auth.ts`
Знайди функцію logout/clearAuth і **захисти** ключі налаштувань:

```typescript
// ПЕРЕД (приклад):
// localStorage.clear();

// ПІСЛЯ — очищати тільки auth, не чіпати settings:
const SETTINGS_KEYS_TO_PRESERVE = [
  "github_token",
  "github_repo", 
  "agent_architect_url",
  "agent_drakon_url",
  "agent_docs_url",
  "llm_provider",
  "llm_model",
  "proxy_url",
];

export function clearAuth() {
  // Зберігаємо settings перед очищенням
  const preserved: Record<string, string> = {};
  SETTINGS_KEYS_TO_PRESERVE.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val) preserved[key] = val;
  });

  localStorage.clear(); // або видаляємо тільки auth ключі

  // Відновлюємо settings
  Object.entries(preserved).forEach(([key, val]) => {
    localStorage.setItem(key, val);
  });
}
```

> Якщо logout не робить `localStorage.clear()` — шукай де саме токен зникає:
> ```bash
> grep -n "github_token\|githubToken\|pat\|personalAccessToken" \
>   src/lib/settings-storage.ts src/lib/auth.ts \
>   src/context/AuthContext.tsx src/pages/LoginPage.tsx
> ```
> Можливо `AuthContext` при ініціалізації перезаписує settings дефолтними значеннями.
> Тоді fix — ініціалізувати налаштування тільки якщо ключа ще немає:
> ```typescript
> // НЕ робити: setItem(key, defaultValue)  — перезатирає існуюче
> // РОБИТИ:
> if (!localStorage.getItem(key)) {
>   localStorage.setItem(key, defaultValue);
> }
> ```

### Верифікація
```bash
npx tsc --noEmit 2>&1 | grep -i error | head -10
```

---

## TASK-191: Список проектів порожній — завантажити з Workers

### Діагностика
```bash
cat src/components/workspace/ProjectSelector.tsx 2>/dev/null || \
  find src -name "*Project*" -o -name "*project*" | grep -v node_modules | head -10

grep -n "GET.*project\|fetchProjects\|projects.*fetch\|useProjects" \
  src/lib/api.ts src/lib/pipeline-api.ts src/lib/agent-api.ts \
  src/context/ProjectContext.tsx 2>/dev/null | head -30
```

### Fix — `src/lib/api.ts` або відповідний файл

Додати функцію завантаження проектів з Flue Worker:

```typescript
// src/lib/agent-api.ts  (або де зараз api calls)

import { readSettings } from "@/lib/settings-storage";

export interface ProjectEntry {
  slug: string;
  name: string;
  path?: string;
  repo_url?: string;
  last_sync?: string;
}

export async function fetchProjects(): Promise<ProjectEntry[]> {
  try {
    const settings = readSettings();
    const base = (settings.agents?.architectUrl || 
                  "https://architect-agent-flue.maxfraieho.workers.dev")
                  .replace(/\/+$/, "");
    const resp = await fetch(`${base}/projects`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.projects ?? data ?? [];
  } catch (e) {
    console.warn("fetchProjects failed:", e);
    return [];
  }
}

export async function createProject(project: {
  slug: string;
  name: string;
  path: string;
  description?: string;
  repo_url?: string;
}): Promise<boolean> {
  try {
    const settings = readSettings();
    const base = (settings.agents?.architectUrl || 
                  "https://architect-agent-flue.maxfraieho.workers.dev")
                  .replace(/\/+$/, "");
    const resp = await fetch(`${base}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
```

### Fix — `ProjectSelector.tsx` або де рендериться список

```typescript
// Додати useEffect для завантаження проектів
import { fetchProjects, ProjectEntry } from "@/lib/agent-api";

// У компоненті:
const [projects, setProjects] = useState<ProjectEntry[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchProjects()
    .then(setProjects)
    .finally(() => setLoading(false));
}, []);

// У render — показати список замість порожнього стану:
{loading ? (
  <div className="text-muted-foreground text-sm">Завантаження...</div>
) : projects.length === 0 ? (
  <div className="text-muted-foreground text-sm">Немає проектів. Додайте перший.</div>
) : (
  projects.map((p) => (
    <button key={p.slug} onClick={() => onSelect(p.slug)}
      className="w-full text-left px-3 py-2 hover:bg-accent rounded">
      <div className="font-medium">{p.name}</div>
      <div className="text-xs text-muted-foreground">{p.slug}</div>
    </button>
  ))
)}
```

---

## TASK-192: Агенти offline — діагностика Flue Workers

### Крок 1 — Перевірити реальний стан Workers
```bash
echo "=== Health check Flue Workers ==="
curl -s -m 5 https://architect-agent-flue.maxfraieho.workers.dev/health && echo " [OK]" || echo " [FAIL]"
curl -s -m 5 https://drakon-agent-flue.maxfraieho.workers.dev/health && echo " [OK]" || echo " [FAIL]"
curl -s -m 5 https://docs-agent-flue.maxfraieho.workers.dev/health && echo " [OK]" || echo " [FAIL]"
```

### Крок 2 — Перевірити що frontend пінгує
```bash
grep -n "health\|agentHealth\|ping\|useAgentHealth" \
  src/hooks/useAgentHealth.ts \
  src/lib/agent-api.ts \
  src/lib/api.ts 2>/dev/null | head -30

cat src/hooks/useAgentHealth.ts 2>/dev/null
```

### Крок 3 — Перевірити URL у налаштуваннях (Settings)

Відкрий в браузері `aidrakon.tech/settings` і перевір поля:
- Architect Agent URL → має бути `https://architect-agent-flue.maxfraieho.workers.dev`
- DRAKON Logic Agent URL → `https://drakon-agent-flue.maxfraieho.workers.dev`  
- Docs Agent URL → `https://docs-agent-flue.maxfraieho.workers.dev`

Якщо там стоять старі Python-агент адреси (`:8765`, `:8766`, `:8767`) — проблема в цьому.

### Fix A — defaultSettings у `settings-storage.ts`

```bash
cat src/lib/settings-storage.ts | grep -A 30 "default\|initial\|DEFAULT"
```

Оновити дефолтні URL на Flue Workers:

```typescript
const DEFAULT_SETTINGS = {
  agents: {
    architectUrl: "https://architect-agent-flue.maxfraieho.workers.dev",
    drakonUrl: "https://drakon-agent-flue.maxfraieho.workers.dev",
    docsUrl: "https://docs-agent-flue.maxfraieho.workers.dev",
  },
  llm: {
    provider: "openai",
    model: "gemini-2.5-flash",  // або claude-sonnet-4-6
    proxyUrl: "https://agy.exodus.pp.ua",
  },
  // ...
};
```

### Fix B — модель "невідома" для drakon-assistant-proxy

```bash
grep -rn "drakon-assistant-proxy\|model.*unknown\|модель невідома" src/ | head -10
```

Замінити hardcoded proxy на AGY URL:
```typescript
// Якщо є константа типу:
// const DRAKON_PROXY = "drakon-assistant-proxy";
// Замінити на:
const DRAKON_PROXY = settings.agents?.drakonUrl || 
                     "https://drakon-agent-flue.maxfraieho.workers.dev";
```

### Fix C — якщо Workers реально не відповідають (CF Worker crashed)

```bash
# Перевірити CF Worker logs через wrangler (якщо є доступ):
cd services/drakon-agent-flue
npx wrangler tail 2>&1 | head -20 || echo "wrangler tail не доступний"

# Або просто redeploy:
cd services/architect-agent-flue
npx wrangler deploy --config wrangler.toml 2>&1 | tail -5
cd ../drakon-agent-flue  
npx wrangler deploy --config wrangler.toml 2>&1 | tail -5
cd ../docs-agent-flue
npx wrangler deploy --config wrangler.toml 2>&1 | tail -5
```

---

## TASK-193: Encoding bug — "SlotRouter â score_candidate"

### Діагностика
```bash
grep -rn "atob\|btoa\|base64\|decodeURIComponent\|TextDecoder\|diagram.*name\|title.*decode" \
  src/lib/diagram-storage.ts \
  src/lib/api.ts \
  cloudflare-worker/worker-mcp-drakon.js 2>/dev/null | head -30
```

### Fix — frontend side (якщо Worker вже виправлений)

Стара БД має некоректні записи. Додати sanitize при відображенні:

```typescript
// src/lib/diagram-storage.ts або де рендеряться назви

export function sanitizeDiagramName(raw: string): string {
  try {
    // Спроба виправити Latin-1 → UTF-8 помилку
    const bytes = new Uint8Array(
      [...raw].map((c) => c.charCodeAt(0))
    );
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    // Якщо decoded виглядає краще — повернути його
    if (!decoded.includes("â") && !decoded.includes("Ã")) return decoded;
  } catch {}
  return raw;
}
```

Або — простіший варіант, замінити відомі артефакти:
```typescript
export function fixDiagramName(name: string): string {
  return name
    .replace(/â/g, "→")    // стрілка
    .replace(/Ã\x83/g, "і")  // кирилиця
    // додати інші якщо є
    || name;
}
```

Використати у `DiagramsPage.tsx` при відображенні картки.

---

## TASK-194: `/docs` — помилка "Не вдалося завантажити файл з GitHub"

### Діагностика
```bash
grep -rn "Не вдалося завантажити\|failed.*github\|github.*error\|fetchFile\|loadFile" \
  src/pages/EditorPage.tsx \
  src/lib/docs-api.ts \
  src/hooks/useGithubRepos.ts 2>/dev/null | head -30
```

Ця помилка — наслідок TASK-190 (токен зникає). Але може бути і окрема причина:
файл відкривається одразу при виборі, не чекаючи завантаження токена.

### Fix — lazy load з fallback

```typescript
// де завантажується файл (EditorPage або docs-api.ts):

async function loadGithubFile(path: string) {
  const token = getGithubToken(); // з settings
  if (!token) {
    // НЕ кидати помилку — показати пояснення
    throw new Error(
      "GitHub токен не налаштований. Перейдіть у Settings → GitHub Token."
    );
  }
  // ... решта логіки
}

// У компоненті — catch з людським повідомленням:
} catch (e) {
  const msg = e instanceof Error ? e.message : "Помилка завантаження";
  toast.error(msg, {
    action: {
      label: "Налаштувати",
      onClick: () => navigate("/settings"),
    },
    duration: 8000,
  });
}
```

---

## STEP FINAL — Sync + TypeScript check + Deploy

```bash
cd ~/workspace/ai-drakon-scaffolder

# TypeScript перевірка
npx tsc --noEmit 2>&1 | grep -i "error" | head -20

# Sync src → .lovable
cp -r src/ .lovable/src/
echo "sync done"

# Перевірити що синкнулись правильні файли
diff -rq src/ .lovable/src/ --exclude="*.map" 2>/dev/null | head -10

# Commit
git add src/ .lovable/src/
git diff --cached --stat

git commit -m "fix(ui): token persistence + project list + agent URLs + encoding

- settings-storage: preserve GitHub token on re-auth (TASK-190)
- ProjectSelector: fetch projects from Flue Worker /projects (TASK-191)  
- settings: default agent URLs → Flue Workers (TASK-192)
- diagrams: sanitize encoding bug in diagram names (TASK-193)
- docs: human error message + navigate to settings (TASK-194)"

git push origin main
```

### Верифікація після деплою (5–10 хв на CF Pages build)

```bash
# Перевірити чи Workers відповідають
curl -s https://architect-agent-flue.maxfraieho.workers.dev/health
curl -s https://drakon-agent-flue.maxfraieho.workers.dev/health
curl -s https://docs-agent-flue.maxfraieho.workers.dev/health

# Очікувано: {"status":"ok"} або {"status":"healthy"}
```

Відкрити в браузері:
- `aidrakon.tech/settings` → перевірити що URL агентів = Flue Workers
- `aidrakon.tech/agents` → агенти мають стати зеленими
- Зробити logout → login → перевірити що GitHub токен збережений
- `aidrakon.tech/diagrams` → назва діаграми без "â"
- `aidrakon.tech/settings` → "Управління проектами" → список проектів

---

## DIARY

```
SESSION:$(date +%Y-%m-%d)|TASK-190..194:ui-bug-sprint|token-fix+project-list+agent-urls+encoding|commit:<hash>|★★★★
```

---

## ПРИМІТКИ

- Якщо `npx wrangler deploy` не працює через CF_API_TOKEN → пропусти redeploy Workers,
  зосередься тільки на frontend fixes
- Якщо Workers здорові (curl /health = ok) але UI показує червоний — проблема в URL
  налаштувань або CORS заголовках Worker
- Якщо `settings-storage.ts` використовує Appwrite замість localStorage — шукай де
  `databases.updateDocument` або `account.updatePrefs` очищає поля при логіні

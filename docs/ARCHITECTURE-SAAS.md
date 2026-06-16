# AI-DRAKON SaaS — Архітектура мультитенантної платформи

> **Переосмислення (2026-06-12):** цей документ описує SaaS-ОБГОРТКУ
> (auth, billing, tenancy). Ядро продукту — компілятор DRAKON → агентний код:
> див. [`ARCHITECTURE-CORE.md`](ARCHITECTURE-CORE.md). Roadmap §9 тут
> ЗАСТАРІВ — чинний roadmap у ARCHITECTURE-CORE.md §3. §4 (connectMcpServer
> напряму з Worker) скоригований на MCP-proxy pattern — див. CORE §2.

> **Статус:** проєкт (ФАЗ 2), 2026-06-12. Ґрунтується на Gap Analysis реального коду
> (commit `bceae3e`) та верифікованих сигнатурах Flue API (flueframework.com).
> **Стратегічний план:** «План розвитку SaaS для мультиагентних систем.md»

---

## 1. Діаграма компонентів

```
                 Браузер (React 19 / TanStack)
                 Appwrite Web SDK → a_session_<project_id> cookie
                          │
            ┌─────────────┴──────────────┐
            ▼                            ▼
   Appwrite Cloud (fra)          ai-drakon-flue Worker (Hono)
   ├─ Auth (OAuth2/Email)        ├─ middleware/auth   ← KV cache (TTL 8 хв)
   ├─ Teams (= tenant)           ├─ middleware/quota  ← D1 billing_profiles
   ├─ Databases:                 ├─ workflows/ analyze | generate | refactor
   │   user_profiles             ├─ agents/ architect ─┬─ subagent: drakon
   │   team_settings             │                     └─ subagent: docs
   │   zone_secrets (encrypted)  ├─ tools/ search-kb, analyze-code(acorn),
   │   audit_log (append-only)   │         generate-ir, save-to-project
   └─ Storage (діаграми/файли)   ├─ D1 (tenant-дані) + KV (сесії, кеш)
                                 ├─ Durable Objects (JobStore, FlueRegistry)
                                 └─ connectMcpServer → Зони Знань користувача
                                        ├─ GitNexus  (mcp__gitnexus__*)
                                        └─ NotebookLM (mcp__notebooklm__*)
```

**Поточний стан:** 3 окремі Workers (`drakon/architect/docs-agent-flue`) — всі живі.
**Цільовий стан:** один `ai-drakon-flue` Worker (консолідація за FLUE-MIGRATION-PLAN §2).

## 2. Аутентифікація та tenant isolation

### 2.1 Потік сесії

1. Фронтенд: Appwrite Web SDK (`src/lib/appwrite.ts` — вже існує) → login → cookie
   `a_session_6a23420a003a04b4997b`.
2. `AuthContext` тримає `{user, isAuthenticated, isLoading, login, logout}` (TASK-203).
3. Кожен запит до Worker несе cookie; Hono middleware валідує її.

### 2.2 authMiddleware (Hono, верифіковані API node-appwrite)

```typescript
// middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { Client, Account } from "node-appwrite";

export type Tenant = { userId: string; teamId: string; plan: "free" | "pro" | "enterprise" };

const SESSION_TTL = 480; // 8 хв — KV cache; компроміс свіжість/latency

export const authMiddleware = createMiddleware<{
  Bindings: Env; Variables: { tenant: Tenant };
}>(async (c, next) => {
  const cookie = getCookie(c, `a_session_${c.env.APPWRITE_PROJECT_ID}`);
  if (!cookie) return c.json({ error: "Не авторизовано: відсутня сесія Appwrite" }, 401);

  const cacheKey = `session:${await sha256Hex(cookie)}`;
  const cached = await c.env.SESSION_KV.get<Tenant>(cacheKey, "json");
  if (cached) { c.set("tenant", cached); return next(); }

  const client = new Client()
    .setEndpoint(c.env.APPWRITE_ENDPOINT)
    .setProject(c.env.APPWRITE_PROJECT_ID)
    .setSession(cookie);
  try {
    const user = await new Account(client).get();
    const teamId = (user.prefs?.teamId as string) ?? user.$id; // персональна команда
    const plan = await resolvePlan(c.env.DB, teamId);          // D1 billing_profiles
    const tenant: Tenant = { userId: user.$id, teamId, plan };
    await c.env.SESSION_KV.put(cacheKey, JSON.stringify(tenant), { expirationTtl: SESSION_TTL });
    c.set("tenant", tenant);
    return next();
  } catch {
    return c.json({ error: "Сесія недійсна або протермінована" }, 401);
  }
});
```

KV-ключ: `session:<sha256(cookie)>` → `{userId, teamId, plan}`, TTL 8 хв.

### 2.3 Ізоляція даних (абсолютне правило)

- D1: кожен запит — `WHERE tenant_id = ?` з `c.get("tenant").teamId`. Жодних винятків.
- Appwrite: Document-Level Security (див. `infrastructure/appwrite/schema.ts`).
- Хелпер `tenantDb(c)` обгортає `env.DB.prepare` і додає bind tenant_id — щоб
  «забути фільтр» було структурно неможливо (defense-in-depth).

## 3. Квотування LLM (білінг)

**Важливо:** у Flue API НЕМАЄ interceptors (beforeLLM/afterLLM) — це підтверджено
документацією. Тому квоти реалізуються на рівні Hono middleware маршрутів,
які запускають workflows/агентів:

```typescript
// middleware/quota.ts
export const quotaMiddleware = createMiddleware<{
  Bindings: Env; Variables: { tenant: Tenant; llmCalls?: number };
}>(async (c, next) => {
  const t = c.get("tenant");
  const row = await c.env.DB.prepare(
    "SELECT llm_quota_monthly, llm_consumed FROM billing_profiles WHERE tenant_id = ?"
  ).bind(t.teamId).first<{ llm_quota_monthly: number; llm_consumed: number }>();

  if (row && row.llm_consumed >= row.llm_quota_monthly) {
    return c.json({ error: "Квоту LLM на місяць вичерпано", upgrade: "/settings/billing" }, 402);
  }
  await next();
  // інкремент у фоні — не блокує відповідь
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "UPDATE billing_profiles SET llm_consumed = llm_consumed + ?, updated_at = datetime('now') WHERE tenant_id = ?"
    ).bind(c.get("llmCalls") ?? 1, t.teamId).run()
  );
});
```

Stripe: окремий webhook-маршрут `/billing/stripe-webhook` (перевірка підпису →
оновлення `billing_profiles` через Admin client). Скидання `llm_consumed` —
Cron Trigger Worker-а 1-го числа місяця (`period_start`).

## 4. Зони Знань: динамічний connectMcpServer

Сигнатура верифікована (flueframework.com/docs/api/agent-api):
`connectMcpServer(name, {url, transport?, headers?}) → Promise<{name, tools, close()}>`.

```typescript
// workflows/analyze.ts
import { connectMcpServer, type FlueContext } from "@flue/runtime";
import { drakonAgent } from "../agents/drakon";

export async function run({ init, payload, env }: FlueContext<{ sourceCode: string }, Env> & { payload: { tenantId: string } }) {
  const zones = await env.DB.prepare(
    "SELECT * FROM knowledge_zones WHERE tenant_id = ? AND enabled = 1"
  ).bind(payload.tenantId).all();

  const connections = [];
  const mcpTools = [];
  for (const zone of zones.results) {
    // токен — ТІЛЬКИ з Appwrite zone_secrets через Admin client; D1 тримає лише ref
    const token = await readZoneSecret(env, zone.mcp_auth_secret_ref);
    const conn = await connectMcpServer(zone.zone_name, {
      url: zone.mcp_endpoint_url,
      transport: zone.transport,                      // 'streamable-http' | 'sse'
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    connections.push(conn);
    mcpTools.push(...conn.tools); // Flue сам префіксує: mcp__<zone>__<tool>
  }

  try {
    const harness = await init(drakonAgent, { tools: mcpTools });
    const session = await harness.session();
    return await session.prompt(payload.sourceCode);
  } finally {
    for (const conn of connections) await conn.close(); // обов'язково — без витоків
  }
}
```

Дефолтні зони при onboarding: GitNexus (`gitnexus.exodus.pp.ua/api/mcp`) та
NotebookLM (`notebooklm.exodus.pp.ua/mcp`).

## 5. Мультиагентна топологія (верифіковані Flue API)

```
architect-agent (createAgent, subagents: [drakonProfile, docsProfile])
  │
  ├─ session.task(sourceCode, { agent: "drakon_analyst", result: DrakonIRSchema })
  │     └─ ізольована дочірня сесія → валідований DRAKON IR (valibot)
  │
  ├─ session.task(ir, { agent: "docs_writer", result: DocsSummarySchema })
  │
  └─ dispatch({ id: "docs-agent", input: { action: "update-kb", files } })
        └─ async: повертає DispatchReceipt одразу, docs оновлює KB у фоні
```

```typescript
// agents/drakon.ts
import { defineAgentProfile } from "@flue/runtime";

export const drakonProfile = defineAgentProfile({
  name: "drakon_analyst",
  description: "Перетворює код на валідний DRAKON IR (b0, action, question, end).",
  instructions: "Повертай ТІЛЬКИ DRAKON IR JSON без X/Y координат; params — STRING.",
});

// agents/architect.ts
export const architectAgent = createAgent(() => ({
  model: "custom/gemini-2.5-flash",        // registerProvider('custom', { api: 'openai-completions', baseUrl: PROXY_URL })
  instructions: "...",
  subagents: [drakonProfile, docsProfile],
}));
```

DRAKON IR валідація — valibot-схема з обов'язковими `b0` (type="branch",
branchId=0 — число), `action`, `question` (one/two), `end`; без X/Y.

## 6. Пісочниці

| Тариф | Sandbox | Конфіг |
|---|---|---|
| Free | віртуальна (just-bash, in-memory) | дефолт Flue — поле `sandbox` не вказувати, лише `cwd` |
| Pro/Enterprise | Cloudflare Sandbox / Daytona | Sandbox Connector API, lifecycle на боці платформи |

Принцип: «найвужча пісочниця, що покриває задачу».

## 7. Цільова структура ai-drakon-flue Worker

```
services/ai-drakon-flue/
  src/
    index.ts            ← Hono app: authMiddleware → quotaMiddleware → маршрути
    workflows/ analyze.ts | generate.ts | refactor.ts
    agents/    architect.ts | drakon.ts | docs.ts (профілі + createAgent)
    tools/     search-kb.ts | analyze-code.ts | generate-ir.ts | save-to-project.ts
    middleware/ auth.ts | quota.ts | tenant.ts
  wrangler.toml         ← D1 + KV(SESSION_KV) + DO(FlueRegistry, JobStore) + secrets
  flue.config.ts
```

Міграція: існуючі маршрути architect-agent-flue/src/index.ts переносяться як є,
під authMiddleware. Python-агенти (8765-8767) — fallback до завершення Sprint 5.

## 8. Межі безпеки

1. MCP-токени: тільки Appwrite encrypted attributes; ніколи в D1/коді/TASKS.md.
2. Admin API key Appwrite: тільки CF Secret (`wrangler secret put`).
3. 402 — квота; 401 — сесія; обидва з людським повідомленням українською.
4. tenant_id ін'єктується middleware-ом, ніколи з body запиту.
5. `drakonwidget.js` та `src/lib/drakon/adapter.ts` — незмінні.

## 9. Sprint Roadmap (solo dev + AGY агенти)

| Sprint | Тижні | Зміст | Стан |
|---|---|---|---|
| 1 | 1–2 | Стабілізація: TASK-203 (Appwrite AuthContext), TASK-204 (stale URLs), верифікація токена/encoding | 🔄 у AGY3 |
| 2 | 3–4 | Appwrite Teams onboarding, authMiddleware + KV, D1 схема (цей документ), tenant isolation | план |
| 3 | 5–6 | Knowledge Zones: D1 + zone_secrets + connectMcpServer у workflows; GitNexus/NotebookLM дефолтні зони | план |
| 4 | 7–8 | Білінг: billing_profiles, quotaMiddleware, Stripe webhook, Usage dashboard | план |
| 5 | 9–10 | Консолідація у ai-drakon-flue; subagents + dispatch; virtual sandbox всюди | план |
| 6 | 11–12 | Remote sandbox PoC, onboarding flow, security audit (tenant isolation pen-test) | план |

### 2.4 Корекція (2026-06-12): JWT замість cookie між доменами

Фронтенд (`*.pages.dev`) і Worker (`*.workers.dev`) — різні домени, тому
cookie `a_session_*` (домен Appwrite) до Worker-а НЕ доходить. Робочий механізм:

1. Фронтенд після логіну викликає `account.createJWT()` (TTL 15 хв) і додає
   `Authorization: Bearer <jwt>` до кожного запиту Worker-а (кешувати JWT
   і оновлювати при 401).
2. `authMiddleware` приймає ОБИДВА: Bearer JWT (основний) та cookie (фолбек).
3. KV-кеш однаковий: `session:<sha256(token)>`, TTL 8 хв (< 15 хв життя JWT).

**Продакшн-домен: `aidrakon.tech`.** Цільова топологія доменів:

| Сервіс | Домен |
|---|---|
| Фронтенд (CF Pages) | `aidrakon.tech` |
| ai-drakon-flue Worker | `api.aidrakon.tech` (Worker route) |
| Appwrite custom domain | `auth.aidrakon.tech` (CNAME → fra.cloud.appwrite.io) |

Після налаштування custom domain Appwrite cookie стає first-party для
`*.aidrakon.tech` — cookie-фолбек у authMiddleware запрацює нативно,
JWT залишиться для API-клієнтів та CLI.

Реалізація: `services/architect-agent-flue/src/middleware/auth.ts` (TASK-205).

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[INDEX]] — переглянути всі документи розділу
---
tags:
  - domain:meta
  - status:active
  - format:tutorial
  - diataxis:tutorial
created: 2026-06-17
updated: 2026-06-17
tier: 2
title: "Onboarding — Перший запуск AI-DRAKON"
lang: uk
---

# Onboarding — Перший запуск AI-DRAKON

> **Тип документа (Diátaxis): Tutorial.** Покрокова hands-on інструкція для
> нового розробника. Мета — за одну сесію підняти проєкт локально, зробити
> перший деплой і верифікувати, що все живе. Якщо ти шукаєш "як зробити X"
> у проді — дивись [[DEPLOYMENT]]; якщо опис endpoints — [[API-REFERENCE]].

---

## Вимоги до оточення

- **Node.js 20+** та `npm` (або `pnpm`).
- **Wrangler CLI**: `npm i -g wrangler` (для CF Workers / Pages / D1).
- **Appwrite account** — проєкт уже існує (`6a23420a003a04b4997b`,
  endpoint `fra.cloud.appwrite.io`). Для деплою Functions потрібен
  `appwrite` CLI: `npm i -g appwrite-cli`.
- **Git** + **GitHub account** (репо `maxfraieho/ai-drakon-scaffolder`,
  потрібен `GITHUB_TOKEN` з write-доступом для KB-комітів).
- Обліковий запис Cloudflare з доступом до account `c354ea45a11a1e1c14f1f41fe780cb34`.

---

## 1. Клонування та залежності

```bash
git clone https://github.com/maxfraieho/ai-drakon-scaffolder
cd ai-drakon-scaffolder
npm install
```

> ⚠️ **Lovable-дзеркало**: фронтенд CF Pages будується з теки `.lovable/`.
> Після будь-якої зміни у `src/` обов'язково синхронізуй:
> `cp src/<file> .lovable/src/<file>`. Це жорстке правило проєкту.

---

## 2. Змінні оточення (Environment Variables)

### Frontend (`.env.local` у корені)

```bash
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a23420a003a04b4997b
VITE_WORKER_URL=https://drakon-antigravity-worker.maxfraieho.workers.dev
```

> `.env.local` — у `.gitignore`. **Ніколи не комітити.**

### Main Worker — `drakon-antigravity-worker`

Несекретні значення вже у `wrangler-antigravity.jsonc → vars`
(`MINIO_ENDPOINT`, `MINIO_BUCKET`, `APPWRITE_PROJECT_ID`,
`APPWRITE_DATABASE_ID=ai-drakon`, `APPWRITE_KB_COLLECTION_ID=kb_embeddings`).

Секрети — тільки через `wrangler secret put` (читаються як `env.*` у воркері):

```bash
wrangler secret put JWT_SECRET                --config wrangler-antigravity.jsonc
wrangler secret put APPWRITE_API_KEY          --config wrangler-antigravity.jsonc
wrangler secret put GITHUB_TOKEN              --config wrangler-antigravity.jsonc
wrangler secret put MINIO_SECRET_KEY          --config wrangler-antigravity.jsonc
wrangler secret put GITHUB_APP_CLIENT_SECRET  --config wrangler-antigravity.jsonc
# опційно — статичний ключ для MCP-клієнтів замість JWT:
wrangler secret put MCP_API_KEY               --config wrangler-antigravity.jsonc
```

> Точний перелік секретів — це `env.*`, на які посилається
> `cloudflare-worker/worker-mcp-drakon.js`. Перевіряй там, не вигадуй.

### Appwrite Functions (Console → Functions → Variables)

`llm-gateway` і `semantic-graph` конфігуруються через Appwrite Console:

```
GITHUB_TOKEN=...                  # для semantic-graph (GitHub API)
# llm-gateway тримає ключі провайдерів (NIM / NIM2 / OpenRouter / Gemini)
# у своїх Variables — failover-ланцюг проксі.
```

---

## 3. Ініціалізація бази даних

Перед першим запуском — створити схеми (ідемпотентно, безпечно перезапускати):

```bash
# Appwrite колекції (auth, kb_embeddings, zone_secrets, audit_log)
node infrastructure/appwrite/setup.mjs

# CF D1 metadata schema (diagrams, pipeline_runs, knowledge_zones тощо)
wrangler d1 execute ai-drakon --file infrastructure/d1/schema.sql --config wrangler-antigravity.jsonc
```

---

## 4. Запуск фронтенду локально

```bash
npm run dev    # → http://localhost:5173
```

Логін через Appwrite (email або GitHub OAuth). Фронтенд б'є у Main Worker
за `VITE_WORKER_URL`.

---

## 5. Запуск Main Worker локально (wrangler dev)

```bash
wrangler dev --config wrangler-antigravity.jsonc
# локальний воркер слухає http://localhost:8787
```

Для локального dev секрети підставляються через `.dev.vars` (також у
`.gitignore`), а не `wrangler secret put`.

---

## 6. Перший деплой

```bash
# Frontend → CF Pages: автоматично через GitHub push у main (build з .lovable/)
git push origin main

# Main Worker → CF Workers:
wrangler deploy --config wrangler-antigravity.jsonc

# Агенти (CF Workers, Flue Runtime):
cd services/architect-agent-flue && npx wrangler deploy ; cd -
cd services/docs-agent-flue      && npx wrangler deploy ; cd -

# Appwrite Functions:
appwrite functions createDeployment --functionId llm-gateway   --activate true
appwrite functions createDeployment --functionId semantic-graph --activate true
```

Детальніше про деплой/rollback — [[DEPLOYMENT]].

---

## 7. Верифікація

```bash
curl https://drakon-antigravity-worker.maxfraieho.workers.dev/health
curl https://architect-agent-flue.maxfraieho.workers.dev/health
curl https://docs-agent-flue.maxfraieho.workers.dev/health
```

Очікувано: `{ "status": "ok", ... }`. Якщо щось не так — [[TROUBLESHOOTING]].

Перевір TypeScript чистим перед першим власним комітом:

```bash
npx tsc --noEmit
```

---

## Семантичні зв'язки

**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[DEPLOYMENT]] — How-to: деплой, rollback, моніторинг
- [[TROUBLESHOOTING]] — How-to: типові помилки і рішення
- [[API-REFERENCE]] — Reference: всі endpoints Main Worker
- [[ARCHITECTURE-CORE]] — пояснення продукту (компілятор DRAKON → код)
- [[COLLABORATION]] — інфраструктура та тандем Claude + AGY

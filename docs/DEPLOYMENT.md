---
tags:
  - domain:architecture
  - status:active
  - format:howto
  - diataxis:how-to
created: 2026-06-17
updated: 2026-06-17
tier: 2
title: "Deployment & Operations Guide"
lang: uk
---

# Deployment & Operations Guide

> **Тип документа (Diátaxis): How-to.** Цілеспрямовані рецепти для проду:
> деплой, rollback, моніторинг, міграції БД. Для першого підняття локально —
> [[ONBOARDING]]. Для розбору помилок — [[TROUBLESHOOTING]].

---

## 1. Архітектура деплою

| Компонент | Хостинг | Команда деплою | Тригер |
|-----------|---------|----------------|--------|
| **Frontend** | CF Pages | auto (build з `.lovable/`) | push у `main` |
| **drakon-antigravity-worker** | CF Workers | `wrangler deploy --config wrangler-antigravity.jsonc` | manual / CI |
| **architect-agent-flue** | CF Workers (Flue) | `npx wrangler deploy` у `services/architect-agent-flue/` | manual |
| **docs-agent-flue** | CF Workers (Flue) | `npx wrangler deploy` у `services/docs-agent-flue/` | manual |
| **llm-gateway** | Appwrite Function | `appwrite functions createDeployment --functionId llm-gateway --activate true` | manual |
| **semantic-graph** | Appwrite Function | `appwrite functions createDeployment --functionId semantic-graph --activate true` | manual |

> Імена воркерів та `account_id` беруться з `wrangler-antigravity.jsonc`
> та `services/*/.flue-vite.wrangler.jsonc`. Перевіряй там перед деплоєм.

---

## 2. Rollback

### CF Worker

```bash
wrangler rollback --config wrangler-antigravity.jsonc
# повертає попередню версію воркера (без зміни коду)
```

### CF Pages (Frontend)

CF Dashboard → **Pages → ai-drakon → Deployments** → обрати попередній
успішний деплой → **Rollback to this deployment**.

### Appwrite Function

Appwrite Console → **Functions → llm-gateway → Deployments** → обрати
попередній → **Activate**. (Так само для `semantic-graph`.)

---

## 3. Моніторинг

### CF Workers — live logs

```bash
wrangler tail --config wrangler-antigravity.jsonc
cd services/architect-agent-flue && npx wrangler tail ; cd -
cd services/docs-agent-flue      && npx wrangler tail ; cd -
```

### Health checks

```bash
curl https://drakon-antigravity-worker.maxfraieho.workers.dev/health
curl https://architect-agent-flue.maxfraieho.workers.dev/health
curl https://docs-agent-flue.maxfraieho.workers.dev/health
```

### Appwrite Functions

Appwrite Console → **Functions → <fn> → Executions** — статуси, логи,
тривалість виконань (для `semantic-graph` слідкуй за 900s-таймаутами).

---

## 4. Міграції БД

Платформа має дві БД (див. [[ARCHITECTURE-CORE]] §3.5 Hybrid DB).

### Appwrite — колекції (auth, kb_embeddings, zone_secrets, audit_log)

```bash
node infrastructure/appwrite/setup.mjs
# ідемпотентний: створює БД "ai-drakon" та колекції, безпечно перезапускати
```

### Cloudflare D1 — metadata (diagrams, pipeline_runs, agent_configs, knowledge_zones, billing_profiles)

```bash
# застосувати схему до D1
wrangler d1 execute ai-drakon --file infrastructure/d1/schema.sql --config wrangler-antigravity.jsonc
# (або через міграції, якщо вони підключені у проєкті)
```

> Схема D1: `infrastructure/d1/schema.sql`. Кожен запит у воркері —
> з `WHERE tenant_id = ?` (інваріант мультиоренди).

---

## 5. Секрети (ніколи в git!)

- CF Worker секрети → **тільки** `wrangler secret put <NAME> --config wrangler-antigravity.jsonc`.
- Appwrite Functions секрети → **тільки** Appwrite Console → Functions → Variables.
- `.env.local` та `.dev.vars` — у `.gitignore`, ніколи не комітити.
- Секрети зон (`zone_secrets`) — Appwrite encrypted attribute, не D1, не код.

> ⚠️ Історичний борг: у `cloudflare-worker/worker-mcp-drakon.js` є
> захардкоджений fallback `APPWRITE_API_KEY`. Він має бути замінений на
> `env.APPWRITE_API_KEY` через `wrangler secret put` — не покладатися на
> fallback у проді.

---

## 6. Lovable / Worker sync (правила проєкту)

- Будь-яка зміна `src/X` → `cp src/X .lovable/src/X` (CF Pages будує з `.lovable/`).
- Будь-яка зміна Worker → деплой + git commit (не лишати розбіжність репо ↔ прод).

---

## Семантичні зв'язки

**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[ONBOARDING]] — Tutorial: перший локальний запуск
- [[TROUBLESHOOTING]] — How-to: типові помилки
- [[API-REFERENCE]] — Reference: endpoints
- [[ARCHITECTURE-CORE]] — §3.5 Hybrid DB (D1 + Appwrite)
- [[COLLABORATION]] — §12 Хмарна міграція (Phases 0–4)

---
tags:
  - domain:meta
  - status:active
  - format:guide
  - diataxis:how-to
created: 2026-06-17
updated: 2026-06-17
tier: 2
title: "Contributing Guide — Як розширювати AI-DRAKON"
lang: uk
---

# Contributing Guide

> **Тип документа (Diátaxis): How-to.** Як розширювати AI-DRAKON як
> людина-розробник. Якщо ти вперше підіймаєш проєкт — спершу [[ONBOARDING]];
> якщо деплоїш зміни — [[DEPLOYMENT]]; за описом endpoints — [[API-REFERENCE]].

## Workflow розробки

1. `git checkout -b feat/my-feature`
2. `npm install`
3. Зміни у `src/` → ЗАВЖДИ `cp src/X .lovable/src/X`
4. `npx tsc --noEmit` (має бути чистим)
5. `npm run dev` — перевірити вручну
6. `git commit -m "feat(scope): description"`
7. `git push` && PR у `main`

## Де що знаходиться

```
src/               — React фронтенд (Vite)
.lovable/src/      — дзеркало для CF Pages (sync обов'язковий)
cloudflare-worker/ — Main Worker (drakon-antigravity-worker)
services/architect-agent-flue/ — Compiler / Ribosome
services/docs-agent-flue/      — Docs MCP agent
services/semantic-graph/       — Appwrite Function (TypeScript)
services/shared/               — спільні типи/утиліти
infrastructure/appwrite/       — setup.mjs (ідемпотентний)
infrastructure/d1/             — schema.sql
docs/                          — документація (цей файл)
development/TASKS.md           — черга задач (формат: [ ] TASK-N)
```

## Як додати новий target у Compiler (Ribosome)

Зараз єдиний активний target: `flue`.
Додати новий (наприклад `cf-agents`):

1. `services/architect-agent-flue/tools/ribosome.ts`
   — додати `case 'cf-agents':` у `compilePseudocode()`
   — реалізувати generator function
2. `src/components/pipeline/CompilerToolbar.tsx`
   — додати опцію в target selector
3. `docs/API-REFERENCE.md`
   — оновити `/compile` "target" enum
4. `npx tsc --noEmit` → clean → commit

## Як додати нову KB Knowledge Zone

1. Appwrite Console → DB `ai-drakon` → Collection `knowledge_zones`
   — додати запис `{ id, name, zoneId, mcp_url }`
2. Або через API: `POST /v1/user/config` (user конфіг з `zoneId`)
3. `architect-agent-flue/tools/mcp-proxy.ts`
   — `fetchZoneContext()` автоматично підхопить через `zoneId` у `/compile`

## Тестування

Автоматизованих тестів зараз мінімум. Перед PR обов'язково:

### TypeScript compile check

```bash
npx tsc --noEmit
```

### Manual smoke test

```bash
curl https://drakon-antigravity-worker.maxfraieho.workers.dev/health
curl https://architect-agent-flue.maxfraieho.workers.dev/health
```

### Compiler test (потрібен JWT)

`POST /compile` з `pseudocode="step1\nstep2"` і `pipelineName="test"` →
має повернути TypeScript код без 500.

### KB vector search test

```
POST /v1/kb/index?project=test           → indexed > 0
POST /v1/kb/search?project=test  body={"query":"test"}  → results array
```

## Code style

- TypeScript strict mode (`tsconfig.json`)
- Tailwind CSS через CSS variables тільки (`--background`, `--card`, `--accent-amber`)
- Без коментарів крім non-obvious WHY
- Без `console.log` у проді (`wrangler tail` для дебагу)

## PR checklist

- [ ] `tsc --noEmit` чистий
- [ ] `.lovable/` синхронізовано якщо змінено `src/`
- [ ] Документацію оновлено якщо змінився API або архітектура
- [ ] `development/TASKS.md` TASK позначено `[x]` якщо PR закриває задачу

## Семантичні зв'язки

**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[ONBOARDING]] — спочатку підніми проект локально
- [[DEPLOYMENT]] — як деплоїти зміни
- [[API-REFERENCE]] — endpoints для тестування
- [[ARCHITECTURE-CORE]] — архітектурні рішення продукту

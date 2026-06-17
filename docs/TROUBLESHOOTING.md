---
tags:
  - domain:architecture
  - status:active
  - format:howto
  - diataxis:how-to
created: 2026-06-17
updated: 2026-06-17
tier: 2
title: "Troubleshooting Guide"
lang: uk
---

# Troubleshooting Guide

> **Тип документа (Diátaxis): How-to.** Симптом → причина → рішення для
> типових збоїв AI-DRAKON. Для опису endpoints — [[API-REFERENCE]]; для
> деплою/rollback — [[DEPLOYMENT]].

---

## 401 Unauthorized

**Причина:** JWT прострочений або OAuth-сесія не відновилась.
**Рішення:** Logout → Login; або очистити `localStorage` → refresh.
JWT отримується через Appwrite SDK `account.createJWT()` і має короткий TTL —
фронтенд має перевипускати його перед запитами у Worker.

---

## OAuth GitHub → кидає на /login (incognito)

**Причина:** race condition — route guard перевіряє `localStorage` ДО
завершення `AuthContext` (`account.get()`).
**Рішення:** ВИПРАВЛЕНО в TASK-249 через `useRequireAuth()` hook.
**Перевірити:** `src/lib/route-auth.ts → useRequireAuth()`, `src/routes/*.tsx`.

---

## 402 LLM quota exceeded

**Причина:** перевищено plan limits (`quotaMiddleware` у `architect-agent-flue`).
**Рішення:** перевір план у Appwrite DB → `user_profiles` / `billing_profiles`
→ поле плану. `quotaMiddleware` стоїть на LLM-маршрутах (`/me`, compile-шлях).

---

## Semantic graph build "timeout"

**Причина:** Appwrite Function `semantic-graph` має async-ліміт 900s.
**Рішення:** задача запускається асинхронно
(`POST /v1/notes/build-semantic-graph`) → опитуй статус
(`GET /v1/notes/semantic-graph-status`), результат читай через
`GET /v1/notes/graph`. Не чекай синхронної відповіді.

---

## CF Worker 500 на /compile (architect-agent-flue)

**Причина:** збій рибосоми (`compilePseudocode`) або LLM-gateway failure;
часто — відсутній/невалідний `pseudocode`/`pipelineName` у тілі запиту
(тоді буде 400, не 500).
**Рішення:**
1. `curl https://architect-agent-flue.maxfraieho.workers.dev/health`
2. `npx wrangler tail` у `services/architect-agent-flue/` — live logs.
3. LLM failover у `llm-gateway`: NIM → NIM2 → OpenRouter → Gemini 2.5 Flash
   (автоматично; якщо всі впали — перевір ключі провайдерів у Appwrite
   Function Variables).

---

## TypeScript build error після змін

**Рішення:** `npx tsc --noEmit` має бути чистим. Якщо є помилки — виправ
ДО деплою. Не забудь синхронізувати `src/X` → `.lovable/src/X` (інакше
прод-білд CF Pages розійдеться з локальним кодом).

---

## KB search повертає порожній масив

**Причина:** колекція `kb_embeddings` порожня для цього проєкту, або статті
ще не проіндексовані в ембединги.
**Рішення:** `POST /v1/kb/index` (з JWT) — проіндексувати KB проєкту, потім
`POST /v1/kb/search`. Перевір, що `APPWRITE_KB_COLLECTION_ID=kb_embeddings`
та `APPWRITE_DATABASE_ID=ai-drakon` у `wrangler-antigravity.jsonc → vars`.

---

## Archivist AI (NotebookLM MCP) недоступний

**Причина:** RPi 4B (`192.168.3.234:8002`) down або MCP-сервер впав.
**Рішення:**
```bash
sshpass -p '805235io.' ssh vokov@192.168.3.234
# перезапустити MCP-сервер (systemd або вручну python3 ~/mcp-server/server.py)
```
Archivist — Рівень 3 пам'яті (концептуальна), його падіння не блокує
компілятор, тільки RAG-аналіз доків.

---

## AGY LLM-проксі / agy.exodus.pp.ua не відповідає

**Причина:** хтось ще шле LLM-запити на застарілий `agy.exodus.pp.ua`.
**Рішення:** ⚠️ `agy.exodus.pp.ua` як LLM-проксі **DEPRECATED** — усі
LLM-запити йдуть через `llm-gateway` Appwrite Function
(`6a3200cd00182e876067.fra.appwrite.run`). Онови конфіг клієнта. Тунель
лишається тільки для прямого SSH-делегування задач на AGY-пристрої.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[DEPLOYMENT]] — How-to: rollback, моніторинг, wrangler tail
- [[API-REFERENCE]] — Reference: endpoints, формати запитів
- [[ONBOARDING]] — Tutorial: перший запуск
- [[COLLABORATION]] — інфраструктура та LLM-gateway

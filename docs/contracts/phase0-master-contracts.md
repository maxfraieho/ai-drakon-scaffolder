# Phase 0 Master Contracts — MetaHarness → AI-DRAKON Integration

> **Версія:** 1.0 (Мастер-контракт)  
> **Дата:** 2026-06-30  
> **Статус:** ЗАФІКСОВАНО  

Цей документ об'єднує результати дослідження кодових баз `agent-harness-generator` (MetaHarness) та `ai-drakon-scaffolder`. Всі контракти переорієнтовані на архітектуру **Cloudflare Worker + Appwrite Functions (Node.js/TS)** без використання Python/FastAPI.

---

## 1. DRAKON IR Types (14 types) — Референс: HTSE

Canonical IR містить 14 типів вузлів. Кожен вузол має стабільний ідентифікатор `id` (який відповідає ID в редакторі) та поля зв'язків `one`, `two`, `side`.

| IrItemType | Семантика виконання | Поля зв'язків (one, two, side) | nodeKind мета-значення |
|:---|:---|:---|:---|
| `header` | Вхідна точка діаграми. Містить метадані та параметри. | `one`: ID першого виконуваного вузла | N/A |
| `action` | Виконання операції (LLM або виклик інструменту). | `one`: ID наступного вузла | `llm` (LLM-codegen), `tool` (MCP tool) |
| `question` | Двозначне розгалуження (IF/ELSE). | `one`: перехід YES (якщо `flag1` = false)<br>`two`: перехід NO (якщо `flag1` = false) | N/A |
| `select` | Багатозначне розгалуження (SWITCH). | `one`: ID першого `case` вузла | N/A |
| `case` | Варіант вибору для select. | `one`: ID наступного вузла у разі збігу умови | N/A |
| `branch` | Вхідна точка силуету (під-сценарій). | `one`: ID першого вузла силуету | N/A |
| `address` | Перехід на інший силует (GOTO branch). | `one`: ID цільового `branch` вузла | N/A |
| `insertion`| Виклик іншого DRAKON-сценарію (функції). | `one`: ID наступного вузла | N/A |
| `input` | Очікування вхідних даних від користувача. | `one`: ID наступного вузла | N/A |
| `output` | Емісія або повернення результату. | `one`: ID наступного вузла | N/A |
| `shelf` | Маркер паралельного виконання. | `one`: головний потік<br>`side`: паралельний потік | N/A |
| `process` | Виклик зовнішньої n8n автоматизації. | `one`: ID наступного вузла | `n8n` |
| `timer` | Затримка виконання (delay gate). | `one`: ID наступного вузла | N/A |
| `duration` | Обмеження по часу (timeout gate). | `one`: ID наступного вузла | N/A |
| `end` | Термінальний вузол (EXIT). | Не має зв'язків | N/A |

### 🔍 Детермінована семантика `flag1` для `question` вузлів:
- За замовчуванням `flag1 === false` (або `undefined`): `one` є гілкою **YES** (true), `two` є гілкою **NO** (false).
- Якщо `flag1 === true` (інверсія): `one` інтерпретується як гілка **NO** (false), `two` як гілка **YES** (true).

---

## 2. ToolClaim Schema — Джерело: MetaHarness dispatch.ts

Криптографічно підписаний `ToolClaim` передається у HTTP-заголовку `X-Tool-Claim` для перевірки доступу агента до інструментів на рівні Cloudflare Worker.

```typescript
export interface ToolClaim {
  capability: string;    // Рядок дозволу, наприклад "mcp.gitnexus.query"
  resource?: string;     // scope ресурсу, наприклад "owner/repo-name" або "*"
  expires_at: number;    // Unix timestamp (секунди) закінчення дії заяви
}

export interface DispatchOptions {
  server: string;
  tool: string;
  args: Record<string, unknown>;
  claims: ToolClaim[];
  resource?: string;
}
```

### 🛡️ Алгоритм перевірки Wildcard Capabilities (`capabilityMatches`):
```typescript
function capabilityMatches(granted: string, requested: string): boolean {
  if (granted === '*' || granted === requested) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return requested === prefix || requested.startsWith(prefix + '.');
  }
  return false;
}

function resourceMatches(granted: string | undefined, requested: string | undefined): boolean {
  if (granted === undefined) return true;
  if (requested === undefined) return false;
  if (granted === requested || granted === '*') return true;
  if (granted.endsWith('/*')) {
    const prefix = granted.slice(0, -2);
    return requested.startsWith(prefix + '/');
  }
  return false;
}
```

---

## 3. Таксономія можливостей (Capabilities) для AI-DRAKON

| Категорія інструменту | Capability Pattern | Опис ресурсу (Resource Scope) |
|:---|:---|:---|
| **Appwrite Database** | `appwrite.database.[collection].read` / `write` | ID Бази даних / ID проекту |
| **GitNexus** | `mcp.gitnexus.query` / `impact` | Назва репозиторію (`owner/repo`) |
| **NotebookLM** | `mcp.notebooklm.chat_ask` | ID записника NotebookLM |
| **GitHub Access** | `github.repo.[owner]/[repo].commit` / `read` | Назва репозиторію |
| **Drakon Engine** | `drakon.codegen.execute` | ID діаграми |

---

## 4. Appwrite Functions API — Референс: `worker-mcp-drakon.js`

Усі серверні функції викликаються асинхронно через HTTP POST до Appwrite API: `https://fra.cloud.appwrite.io/v1/functions/{id}/executions`.

### 4.1. DRAKON Codegen (`DRAKON_CODEGEN_FUNCTION_ID`)
- **Вхідні дані (Body):**
  ```json
  {
    "description": "string",
    "language": "string (default: JS2604)",
    "functionName": "string (default: myFunction)",
    "params": "string (default: '')",
    "model": "string (optional)"
  }
  ```
- **Вихідні дані (у logs або responseBody):**
  Повертає рядок у форматі `DRAKON_JSON_RESULT:<base64-encoded-json>` в logs, де закодований JSON має вигляд:
  ```json
  {
    "success": true,
    "proposed": [],
    "stats": { "notes": 0, "links": 0, "changed": 0 }
  }
  ```

### 4.2. DRAKON Compiler (`DRAKON_COMPILER_FUNCTION_ID`)
- **Вхідні дані (Body):**
  ```json
  {
    "name": "string",
    "root": "string",
    "diagrams": "object (Record<string, DrakonDiagram>)",
    "language": "string (default: JS)",
    "mainFun": "string (optional)",
    "settings": "object (optional)"
  }
  ```
- **Вихідні дані (у logs або responseBody):**
  Містить `DRAKON_CODE_RESULT:<base64-encoded-json>` в logs, де закожаний JSON має вигляд:
  ```json
  {
    "ok": true,
    "error": "string (optional)"
  }
  ```

---

## 5. Реєстр маршрутів Worker та статус legacy FastAPI-плану

Таблиця нижче — історичний план міграції, не поточний маршрутний контракт. `architect-agent` і `drakon-agent` реально мають FastAPI/Python-код; Worker також містить async Appwrite paths. Перед зміною маршруту потрібен окремий ADR і контрактна перевірка.

| Маршрут Gateway | Legacy Handler | Новий Handler (Appwrite Function) | Складність |
|:---|:---|:---|:---|
| `POST /v1/pipeline/execute` | Legacy FastAPI `:8766` (planned migration) | Appwrite target unresolved | Medium |
| `GET /v1/pipeline/status` | Legacy FastAPI `:8766` (planned migration) | Appwrite target unresolved | Low |
| `POST /v1/agents/chat/:agentId`| Legacy FastAPI `:8766` (planned migration) | Appwrite target unresolved | Medium |
| `GET /v1/pipeline/stream/:jobId`| Legacy FastAPI SSE (planned migration) | Appwrite polling is proposed, not verified | Low |

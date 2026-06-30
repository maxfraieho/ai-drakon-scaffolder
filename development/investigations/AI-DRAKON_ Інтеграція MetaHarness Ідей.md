

# 🏗️ ПЛАН АДАПТАЦІЇ ПАТЕРНІВ METAHARNESS → AI-DRAKON v2.0

> **Версія:** 2.0 (Фінальна) · **Дата:** 2026-06-30  
> **Джерела:** Дослідження Gemini + GitNexus індекси `agent-harness-generator` та `ai-drakon-scaffolder`  
> **Цільовий репозиторій:** `/home/vokov/workspace/ai-drakon-scaffolder/`

---

## 📋 ЗМІСТ

1. [Архітектурні якорі](#1-архітектурні-якорі)
2. [Phase 0: GitNexus Deep-Dive](#2-phase-0-gitnexus-deep-dive)
3. [Phase 1: DrakonHarnessRunner + ToolDispatcher](#3-phase-1-drakonharnessrunner--tooldispatcher)
4. [Phase 2: 4-Gate Control Plane](#4-phase-2-4-gate-control-plane)
5. [Phase 3: Контекст + Візуалізація](#5-phase-3-контекст--візуалізація)
6. [🔁 Sync & Handoff Protocol](#6--sync--handoff-protocol)
7. [🛡️ Validation & Rollback](#7--validation--rollback)
8. [📊 Моніторинг та Feature Flags](#8--моніторинг--та-feature-flags)

---

## 1. Архітектурні якорі

### ✅ АДАПТУЄМО

| Патерн | Джерело в MetaHarness (GitNexus) | Реалізація в AI-DRAKON |
|--------|----------------------------------|----------------------|
| Детермінований планувальник | `meta.planner = 'drakon-deterministic'` | `services/architect-agent/deterministic_engine.py` — топологічний обхід DRAKON IR |
| ToolDispatcher | `packages/kernel-js/src/dispatch.ts` + `crates/kernel/src/dispatch.rs` | `src/lib/harness/tool-dispatcher.ts` — in-process firewall |
| 4-gate control plane | `dispatch.rs` → `claims.rs:check` + `policyTs` | `src/lib/harness/gates/` (TS) + `services/architect-agent/pipeline/gates.py` (Python) |
| "Модель пропонує → Ядро вирішує" | Архітектурна парадигма MetaHarness | Вбудовується в `deterministic_engine.py` + `tool-dispatcher.ts` |
| HarnessSpec (спрощена) | `buildScaffold → mcpFiles → policyTs` | `src/lib/harness/harness-spec.ts` — TypeScript interface |

### ❌ ВІДКИДАЄМО

| Елемент | Причина |
|---------|---------|
| WASM/NAPI (`crates/kernel/`) | AI-DRAKON працює на Python/TS, не потребує бінарників |
| CLI `npx metaharness` | Visual-first платформа, CLI не потрібен |
| npm publish workflow | Агенти = GitHub repos, не npm пакети |
| Multi-harness orchestration | Фокус "один проєкт = один агент" |
| Власний Governance Engine | Делегуємо Appwrite JWT + спрощений ToolClaim |

---

## 2. Phase 0: GitNexus Deep-Dive

> **Мета:** Повне розуміння оригінальних реалізацій до початку розробки  
> **Тривалість:** 2-3 дні · **Відповідальний:** 🤖 АГЕНТ A + 🤖 АГЕНТ B (паралельно)

### Крок 0.1 — Аналіз ToolDispatcher (🤖 АГЕНТ A)
**Мета:** Зрозуміти flow `ToolCallRequest → claims.check → ToolRegistry.get → execute`
**GitNexus запити:**
```
gitnexus context({name: "ToolDispatcher", repo: "agent-harness-generator"})
gitnexus context({uid: "Function:crates/kernel/src/dispatch.rs:dispatch", repo: "agent-harness-generator"})
gitnexus impact({target: "dispatch.ts", direction: "downstream", repo: "agent-harness-generator"})
```
**Артефакт:** `docs/contracts/tool-dispatcher-analysis.md` (UML flow, маппінг полів, 8 тест-кейсів з Rust processes).

### Крок 0.2 — Аналіз Scaffold Generator (🤖 АГЕНТ B)
**Мета:** Зрозуміти генерацію файлової структури агента.
**GitNexus запити:**
```
gitnexus context({name: "buildScaffold", repo: "agent-harness-generator"})
gitnexus context({name: "mcpFiles", repo: "agent-harness-generator"})
```
**Артефакт:** `docs/contracts/scaffold-analysis.md` (Маппінг MetaHarness scaffold → AI-DRAKON scaffold).

### Крок 0.3 — Аудит поточного pipeline AI-DRAKON (🤖 АГЕНТ A + 🤖 АГЕНТ B)
**Ключові файли для аудиту:**
| Файл | Роль |
|------|------|
| `services/architect-agent/pipeline/graphs.py` | LangGraph StateGraph (Pipeline A+B) |
| `services/architect-agent/pipeline/states.py` | TypedDict стани (`AnalysisState`, `VibeCodingState`) |
| `src/lib/pipeline-api.ts` | Frontend API клієнт (SSE ready) |
| `src/types/drakonwidget.d.ts` | DrakonItem/DrakonDiagram types |
| `src/components/workspace/WorkspaceShell.tsx` | Головний UI Shell |

**Артефакт:** `docs/contracts/current-state-audit.md` (Таблиця "Точка інтеграції → Файл → Тип зміни").

---

## 3. Phase 1: DrakonHarnessRunner + ToolDispatcher

> **Мета:** Детермінований рушій + програмний firewall  
> **Тривалість:** 2 тижні · **Відповідальний:** 🤖 АГЕНТ A (Backend), 🤖 АГЕНТ B (Frontend)

### Крок 1.1 — HarnessSpec type (🤖 АГЕНТ A)
**Файл:** `src/lib/harness/harness-spec.ts`
```typescript
export interface DrakonHarnessSpec {
  agent_name: string;
  version: string;
  mcp_servers: Record<string, { endpoint: string; required: boolean }>;
  allowed_tools: string[]; // capability strings
  resources: Record<string, string[]>;
  permissions: { max_tokens_per_hour: number; max_execution_time_seconds: number };
  runtime: { entrypoint: string; execution_mode: 'deterministic' | 'hybrid' };
  gates: {
    confidence: { min_score: number };
    policy: { allowed_capabilities: string[] };
    cost: { max_tokens_per_node: number };
    safety: { blocked_patterns: string[]; require_human_approval: string[] };
  };
}
```
**DoD:** Тип експортується, JSON Schema в `docs/contracts/harness-spec-v1.schema.json`, `states.py` отримує поле `harness_spec: dict`.

### Крок 1.2 — Deterministic Engine (🤖 АГЕНТ A)
**Файл:** `services/architect-agent/deterministic_engine.py`
**Логіка:** Топологічний обхід DRAKON IR граф вузол за вузлом. Існуючий `graphs.py` (LangGraph) НЕ видаляється, але новий engine стає default.
**DoD:** Парсинг 14 типів вузлів DRAKON IR, топологічний обхід з детекцією циклів, SSE streaming (`node_start`, `node_done`, `error`, `breakpoint`, `done`).

### Крок 1.3 — ToolDispatcher (🤖 АГЕНТ A)
**Файл:** `src/lib/harness/tool-dispatcher.ts`
**Логіка:** Адаптація з `dispatch.rs`. Flow: `ToolCallRequest → claims.check → ToolRegistry.get → execute`.
**DoD:** 8 test-кейсів (дзеркальних Rust processes), wildcard matching (`mcp.gitnexus.*`), resource scope isolation.

### Крок 1.4 — Frontend Pipeline Client (🤖 АГЕНТ B)
**Файл:** `src/lib/harness/pipeline-client.ts`
**Логіка:** SSE клієнт для нового deterministic endpoint. Інтеграція з Zustand store `usePipelineExecutionStore`.
**DoD:** Споживає всі 5 типів SSE подій, backward compat для існуючого `streamJob` в `pipeline-api.ts`.

---

## 4. Phase 2: 4-Gate Control Plane

> **Мета:** 4 незалежних gate-модулі без спільного мутабельного стану  
> **Тривалість:** 1.5 тижні · **Відповідальний:** 🤖 АГЕНТ A

### Крок 2.1 — Gate Interface + Registry
**Файл:** `src/lib/harness/gates/gate-interface.ts`
**Логіка:** `GateRegistry.evaluateAll()` виконує gates паралельно через `Promise.all`. Жоден gate НЕ мутує спільний стан.

### Крок 2.2–2.5 — Реалізація 4 Gates
- **Confidence Gate** (`confidence-gate.ts`): Score = f(few_shot_matches, node_type_coverage).
- **Policy Gate** (`policy-gate.ts`): Перевірка `allowed_tools` та `resources` з HarnessSpec.
- **Cost Gate** (`cost-gate.ts`): Ліміт токенів на вузол та загальний бюджет.
- **Safety Gate** (`safety-gate.ts`): Блокування `blocked_patterns` (rm -rf, DROP TABLE), human approval.

### Крок 2.6 — Python wrapper для Gates (🤖 АГЕНТ A)
**Файл:** `services/architect-agent/pipeline/gates.py`
**Рішення:** Inline Python (Pydantic). Gates — це прості predicate functions. Переписування на Python зберігає runtime простим та уникає IPC latency.
**DoD:** 4 gate-класи на Python з ідентичною логікою TypeScript версіям. JSON Schema contract гарантує сумісність.

---

## 5. Phase 3: Контекст + Візуалізація

> **Мета:** NotebookLM контекст + DrakonWidget візуалізація gates  
> **Тривалість:** 1.5 тижні · **Відповідальний:** 🤖 АГЕНТ B

### Крок 3.1 — NotebookLM Context Injection (🤖 АГЕНТ B)
**Файл:** `services/architect-agent/notebooklm_bridge.py`
**Логіка:** При виконанні вузла `action` з `meta.nodeKind = 'llm'`, engine запитує NotebookLM API. Контекст інжектується в system prompt LLM.
**DoD:** 
- [ ] NotebookLM API клієнт з retry логікою (3 спроби, exponential backoff).
- [ ] Кешування контексту в Redis/Appwrite (TTL 5 хвилин).
- [ ] Fallback: якщо NotebookLM недоступний → використовувати локальний `kb/` markdown.

### Крок 3.2 — DrakonWidget Gate Visualization (🤖 АГЕНТ B)
**Файли:** Оновлення `src/components/drakon/DrakonNode.tsx` (або еквівалентного рендерера) та `EvidenceDrawer`.
**Дизайн:**
- Кожен вузол DRAKON має 4 міні-іконки (Confidence, Policy, Cost, Safety).
- Зелена іконка = gate passed, червона = denied, жовта = warning.
- Клік на іконку → відкрити `EvidenceDrawer` з детальним gate verdict.
**SSE інтеграція:** `node_done` event містить `gate_verdicts: GateVerdict[]`. Frontend оновлює іконки у реальному часі.

### Крок 3.3 — WorkspaceShell інтеграція (🤖 АГЕНТ B)
**Файл:** `src/components/workspace/WorkspaceShell.tsx`
**Логіка:** Додати нову панель "Execution Trace" в бічне меню (поруч з "ВУЗЛИ", "БАЗА"), яка показує таймлайн виконання DRAKON-графу з логами gates.

---

## 6. 🔁 Sync & Handoff Protocol

### Стратегія Git Branches
| Branch | Відповідальний | Вміст |
|--------|----------------|-------|
| `feat/harness-spec` | 🤖 АГЕНТ A | `harness-spec.ts`, `gate-interface.ts`, JSON schemas |
| `feat/deterministic-engine` | 🤖 АГЕНТ A | `deterministic_engine.py`, `gates.py` |
| `feat/tool-dispatcher` | 🤖 АГЕНТ A | `tool-dispatcher.ts`, 8 unit tests |
| `feat/ui-gates` | 🤖 АГЕНТ B | `DrakonNode.tsx` gate icons, `EvidenceDrawer.tsx` |
| `feat/notebooklm-bridge` | 🤖 АГЕНТ B | `notebooklm_bridge.py`, Redis cache |

### Чекпоінти синхронізації (Sync Points)
| Sync Point | Умова переходу | Артефакти |
|------------|----------------|-----------|
| **SP-1** (Кінець Phase 0) | Обидва агенти завершили `docs/contracts/*-analysis.md` | Git merge `feat/harness-spec` → `main` |
| **SP-2** (Кінець Phase 1) | `deterministic_engine.py` приймає `harness_spec: dict` та повертає SSE events | Інтеграційний тест: `POST /api/pipeline/execute-deterministic` |
| **SP-3** (Кінець Phase 2) | 4 gates працюють паралельно, `evaluateAll` повертає `allPassed: boolean` | Unit tests: 100% coverage для `gates/` |
| **SP-4** (Кінець Phase 3) | DrakonWidget показує gate verdicts у реальному часі | E2E тест: виконання DRAKON діаграми з 3 вузлами |

### Механізм вирішення конфліктів
1. **JSON Schema Contracts:** Всі interfaces (`GateVerdict`, `ToolCallRequest`, `DeterministicEvent`) мають JSON Schema в `docs/contracts/`.
2. **Shared Test Fixtures:** `tests/fixtures/gate-test-cases.json` — обидва агенти використовують ті ж тестові дані.

---

## 7. 🛡️ Validation & Rollback

### Валідація gates (TypeScript vs Python)
**Проблема:** Gates існують у двох версіях (TS для frontend, Python для backend). Як гарантувати ідентичність?
**Рішення:** Shared test fixtures + contract testing.
```json
// tests/fixtures/gate-test-cases.json
[
  {
    "id": "policy-wildcard-match",
    "input": {
      "toolCall": { "server": "gitnexus", "tool": "query", "args": {} },
      "spec": { "allowed_tools": ["mcp.gitnexus.*"] }
    },
    "expected": { "gate": "policy", "allowed": true }
  }
]
```
**CI Pipeline:** Обидва тести (TS та Python) запускаються на одному fixture, результати порівнюються через `diff`.

### Feature Flag для міграції
**Файл:** `services/architect-agent/main.py`
```python
USE_DETERMINISTIC_ENGINE = os.getenv("USE_DETERMINISTIC_ENGINE", "false").lower() == "true"

@app.post("/api/pipeline/execute")
async def execute_pipeline(request: PipelineRequest):
    if USE_DETERMINISTIC_ENGINE:
        return await stream_deterministic(request.drakon_ir, request.harness_spec)
    else:
        return await graphs.execute_pipeline(request.drakon_ir) # Fallback на LangGraph
```

### Rollback план
| Сценарій | Дія | Час відновлення |
|----------|-----|-----------------|
| `deterministic_engine.py` crash | Автоматичний fallback на LangGraph через feature flag | < 1 хвилина |
| Gates TS/Python розсинхронізація | CI pipeline блокує merge, alert у Slack | < 5 хвилин |
| NotebookLM API timeout | Fallback на локальний `kb/` markdown | < 1 секунда |
| ToolDispatcher MCP error | Retry 3 рази, потім emit `error` SSE event | < 10 секунд |

---

## 8. 📊 Моніторинг та Feature Flags

### Metrics (Prometheus-style)
| Metric | Type | Опис |
|--------|------|------|
| `drakon_gate_verdicts_total{gate, verdict}` | Counter | Кількість verdicts по кожному gate |
| `drakon_node_execution_time_ms{node_type}` | Histogram | Час виконання вузла по типу |
| `drakon_tokens_consumed_total{agent_name}` | Counter | Загальне споживання токенів |

### Structured JSON Logging
**Файл:** `services/architect-agent/deterministic_engine.py`
```python
import structlog
logger = structlog.get_logger()

async def execute_node(node: IrNode, state: ExecutionState, gates: FourGateControlPlane):
    logger.info("node_execution_start", node_id=node.id, node_type=node.type)
    # ... виконання ...
    logger.info("node_execution_done", node_id=node.id, tokens=result.tokens, gate_verdicts=[v.dict() for v in gate_results])
```

### Alerting правила
| Alert | Умова | Дія |
|-------|-------|-----|
| `HighGateDenialRate` | > 30% verdicts = denied за 5 хвилин | Slack alert, перевірити `harness_spec` |
| `TokenBudgetExceeded` | `accumulatedTokens > max_tokens_per_hour * 0.9` | Slack alert, emit `breakpoint` SSE |
| `NotebookLMLatencyHigh` | p95 latency > 2 секунди | Fallback на локальний `kb/`, alert |

Виконай також фінальну  валідацію (чи не суперечить він чомусь у індексах GitNexus).
2. **Розділіть план між агентами Gemini:**
   - **Агент A** отримує розділи 1, 2.1, 3.1-3.3, 4 (Phase 2), 6 (Sync), 7 (Validation).
   - **Агент B** отримує розділи 2.2, 3.4, 5 (Phase 3), 6 (Sync).
3. **Додайте в системні промпти агентів:** *"Не починай Phase N до отримання підтвердження Sync Point N-1 від іншого агента. Використовуй `tests/fixtures/gate-test-cases.json` як єдине джерело істини для тестів."*
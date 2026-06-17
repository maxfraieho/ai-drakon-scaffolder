---
tags:
  - domain:architecture
  - status:canonical
  - format:spec
created: 2026-06-12
updated: 2026-06-17
tier: 1
title: "AI-DRAKON — Ядро продукту: компілятор візуальної мови в агентний код"
lang: uk
---

# AI-DRAKON — Ядро продукту: компілятор візуальної мови в агентний код

> Цей документ — переосмислення стратегії після критичного аудиту
> (`docs/krytyka.md`, 2026-06-12). Він ВИЗНАЧАЄ пріоритети.
> `ARCHITECTURE-SAAS.md` залишається чинною специфікацією SaaS-обгортки
> (auth, billing, tenancy), але SaaS-шар — це обгортка, не продукт.

---

## 0. Що ми насправді продаємо

**AI-DRAKON — не редактор діаграм.** Редакторів діаграм сотні.

Головна цінність — **компілятор з візуальної мови DRAKON в агентний код**
плюс **система управління знаннями**, яка робить цю компіляцію точною.

Аналогія ДНК → білок:

```
DRAKON-схема         = ДНК        (єдине джерело істини, framework-agnostic)
    ↓ export
Псевдокод (текст)    = мРНК       (транскрипція, людино-читаємий проміжний формат)
    ↓ + KB цільового фреймворку (Зона Знань через MCP)
Агент-рибосома       = Рибосома   (LLM-агент, що знає цільовий фреймворк)
    ↓
Код агента           = Білок      (робочий TypeScript/Python під конкретний фреймворк)
```

Два стовпи платформи:

1. **Компілятор** — IR → псевдокод → рибосома → код. Логіка версіонується
   у DRAKON IR; код агента — артефакт збірки, як `.js` з `.ts`.
2. **Зони Знань** — NotebookLM / GitNexus / MemPalace через MCP постачають
   рибосомі знання про цільовий фреймворк, патерни tool-calling, few-shot
   приклади. Без KB рибосома — звичайний генератор коду; з KB — компілятор.

Стратегічний наслідок: **незалежність від фреймворку**. Зараз єдиний
актуальний target компілятора — **Flue** (Cloudflare Flue Runtime).
Якщо Flue помре або зламає API (а це реальний ризик — див. §2) —
перенавчаємо рибосому на інший target (CF Agents SDK, LangGraph.js).
DRAKON-схеми клієнтів не чіпаємо. Це і є захист бізнесу, якого не дає
жоден "редактор діаграм".

> **HISTORICAL**: попередні версії цього документа називали `langgraph-py`
> та `langgraph-js` активними targets. LangGraph повністю замінено на
> Flue Runtime (див. `COLLABORATION.md §12`). LangGraph залишається лише
> теоретичним резервним target-ом на випадок відмови Flue, **не активним**.

---

## 1. Пайплайн компіляції

### 1.1 Формат псевдокоду (мРНК)

Експорт зберігає семантику DRAKON, не просто текст:

```
АЛГОРИТМ: ThreatClassifier
ВХІД: message: string, channel: string

[1] ACTION   → search_kb(message)           :: tool :: → [2]
[2] QUESTION → "Чи результат містить загрозу?"
               ТАК (one) → [3]
               НІ  (two) → [5]
[3] ACTION   → "Classify: LOW/MEDIUM/HIGH"  :: llm ::  → [4]
[4] ACTION   → notify_user(threat_level)    :: tool :: → END
[5] ACTION   → log_benign(message)          :: tool :: → END
END
```

Інваріанти формату:
- Мітки `:: tool ::` / `:: llm ::` — обов'язкові (рибосома розрізняє виклик
  інструмента і LLM-промпт).
- Стрілки `(one)` / `(two)` — зберігають семантику гілок DRAKON.
- Жодних X/Y координат (як і в IR).

### 1.2 Експортер — РЕАЛІЗОВАНО 2026-06-12 (TASK-215)

План написати власний `pseudocode-export.ts` СКАСОВАНО: у репо вже існував
готовий генератор — `public/libs/drakongen.js` (Міткін) з обгорткою
`src/lib/drakon/pseudocode.ts` (`diagramToPseudocode`, `pseudocodeToMarkdown`).
TASK-215 лише підключив його до кнопки **Export mRNA** у CompilerToolbar.

ВАЖЛИВА КОРЕКЦІЯ ФОРМАТУ: drakongen-псевдокод НЕ містить міток
`:: tool :: / :: llm ::` (pipelineToIR кладе лише label). Семантика вузлів
передається рибосомі ОКРЕМИМ полем `nodes[]` — `NodeConfig` уже має
`is_llm`, `is_deterministic`, `description`. Формат §1.1 лишається
концептуальним описом; фактичний контракт — `POST /compile`.

### 1.3 Рибосома-агент — v1 РЕАЛІЗОВАНО 2026-06-12 (TASK-216/217)

Жива реалізація: `services/architect-agent-flue/tools/ribosome.ts`
(`compilePseudocode`) + маршрут `POST /compile` + кнопка **Compile** в UI
(скачує `{name}.workflow.ts`). llmConfig з налаштувань UI прокидається (TASK-212).

**KB-зони — Phase 3 ✅ live.** Векторний пошук по KB працює: колекція
`kb_embeddings` в Appwrite DB (768-dim вектори, CF Workers AI
`@cf/baai/bge-base-en-v1.5`). `POST /compile` приймає `zoneId` → рибосома
через MCP-proxy (`tools/mcp-proxy.ts → fetchZoneContext`) підтягує
KB-контекст цільового фреймворку у згенерований код.
Відомий шлiф: системний промпт ще не велить брати модель з env.PROXY_MODEL —
рибосома може вигадати 'gpt-4o' у згенерованому коді.

```
Вхід:
  ├── псевдокод (з редактора)
  ├── список доступних tools (з /tools endpoint architect-agent-flue)
  └── цільовий фреймворк: flue (єдиний активний target)
      ~~langgraph-js~~, ~~langgraph-py~~, ~~cf-agents~~ — HISTORICAL/резерв

KB (через Зону Знань / MCP):
  ├── docs цільового фреймворку
  ├── патерни tool-calling
  ├── схема DRAKON IR
  └── few-shot приклади згенерованого коду

Вихід:
  └── готовий файл агента + верифікація tsc --noEmit
```

Правила трансляції (системний промпт Flue-рибосоми):
- `ACTION :: tool ::` → `await tools.toolName(args)`
- `ACTION :: llm ::`  → `await session.prompt("текст вузла")`
- `QUESTION`          → `if/else` за відповіддю
- `(one)` → наступний крок; `(two)` → else-гілка

### 1.4 Живий цикл (CI/CD на рівні алгоритмів)

```
Змінив DRAKON-схему
  → auto-export псевдокоду
  → рибосома регенерує код
  → tsc --noEmit
  → wrangler deploy
```

Multi-target: одна схема → Flue-worker для продакшну + Python LangGraph для
локального тестування + псевдокод як документація. Три білки з однієї ДНК.

---

## 2. Корекції архітектури за критикою (2026-06-12)

Джерело: `docs/krytyka.md`. Статус кожного пункту:

| # | Проблема | Рішення |
|---|----------|---------|
| 1 | Flue — молодий фреймворк, нестабільний API, subagents без retry | Компілятор ЗНІМАЄ ризик: Flue — лише один із target-ів рибосоми. Не будувати критичну логіку на `session.task()`/subagents до стабілізації |
| 2 | CF Worker CPU limit (30s paid) — довгі пайплайни не влазять | Довгі компіляції → **Durable Objects** (вже є `ArchitectJobStore` DO в architect-agent-flue!) — job-черга з полінгом статусу. CF Workflows — резервний варіант |
| 3 | `connectMcpServer()` не для stateless Workers (SSE handshake 200–500ms на кожен запит) | **MCP-proxy pattern**: Worker → прямий HTTP POST до власних MCP-серверів (NotebookLM, GitNexus) без MCP handshake. `connectMcpServer` — тільки для довгоживучих процесів. §4 ARCHITECTURE-SAAS.md ВВАЖАТИ ЗАСТАРІЛИМ у частині прямого connectMcpServer з Worker |
| 4 | D1 ліміти (10GB, без CASCADE FK, без pooling) | Прийнятно для MVP/Free/Pro. Enterprise-тир — НЕ обіцяти до рішення (R2 + зовнішня БД як опція) |
| 5 | Appwrite Teams RBAC не granular | MVP: editor/viewer на рівні команди. Per-resource permissions — power layer у D1 (`resource_acl` таблиця), тільки коли з'явиться платний попит |
| 6 | Timeline 12 тижнів × solo dev — нереалістично | Roadmap нижче перерахований ×1.5–2, компілятор ПЕРШИЙ (бо це продукт), SaaS-шар добудовується паралельно AGY-агентами |
| 7 | CF Queues недоступні на Free plan | `dispatch()` через Queues відкласти; DO-черга (`ArchitectJobStore`) покриває MVP |

---

## 3. Переосмислений Roadmap

Принцип: **спершу цінність (компілятор), потім обгортка (SaaS)**.
Sprint 1–2 (auth, D1/KV/Appwrite, middleware) — закриті 2026-06-12 ✅.

### Sprint 3 — Компілятор MVP (ядро!) — ✅ ЗАКРИТО 2026-06-12 (за один день: TASK-213..217)
- `src/lib/drakon/pseudocode-export.ts` — IR → псевдокод (детермінований).
- Кнопка "Експорт псевдокоду" в редакторі (DiagramsPage/PipelinesPage).
- Рибосома v1 (target: Flue) — workflow в architect-agent-flue,
  KB-контекст через NotebookLM-зону (MCP-proxy, не connectMcpServer).
- Верифікація: схема ThreatClassifier → псевдокод → робочий
  `workflows/threat-classifier.ts`, `tsc --noEmit` чистий.

### Sprint 4 — Зони Знань (паливо рибосоми)
- Appwrite DB `knowledge_zones` CRUD (`/zones`) + zone_secrets (Appwrite encrypted).
- MCP-proxy маршрут у Worker: `POST /mcp-proxy/:zone` → HTTP до серверів зони.
- UI ZoneCreationDialog → реальний бекенд.
- Рибосома читає KB з зони користувача, не з хардкоду.

### Sprint 5 — Multi-target + цикл компіляції
- Другий target: LangGraph.js або Python LangGraph (порівняння білків).
- Авто-цикл: зміна схеми → re-export → re-compile → tsc → preview.
- Довгі компіляції через `ArchitectJobStore` DO (статус-полінг у UI).

### Sprint 6 — SaaS-добудова (обгортка)
- quotaMiddleware на всі LLM-маршрути (зараз тільки /me).
- Stripe webhook + Cron reset + Usage dashboard.
- Phase 4: Archivist AI → Appwrite Function (консолідація 3 workers вже виконана: drakon-antigravity-worker + architect-agent-flue + docs-agent-flue).

### Sprint 7+ — Гартування
- Per-resource ACL (якщо є попит), security audit, onboarding,
  remote sandbox PoC.

Оцінка: 5 спринтів ≈ 10–14 тижнів реального часу solo dev + AGY-флот
(з коефіцієнтом критики ×1.5–2 від оптимістичних 7).

---

## 3.5. Hybrid DB — розподіл сховищ

Платформа використовує **дві БД** з чітким поділом за типом даних:

| Сховище | Що зберігає | Чому |
|---------|-------------|------|
| **Cloudflare D1** (`ai-drakon`) | metadata: `diagrams`, `pipeline_runs`, `agent_configs`, `knowledge_zones`, `billing_profiles` | низька латентність на edge, поряд з Worker; легкі рядкові записи |
| **Appwrite DB** (`ai-drakon`, project `6a23420a003a04b4997b`) | важкі дані: `kb_embeddings` (768-dim BGE вектори у JSON), `user_profiles`, `zone_secrets` (encrypted), `audit_log` | вектори завеликі для D1; Appwrite дає encrypted attributes для секретів зон та керовану auth |

D1 — для всього, що читається/пишеться у гарячому шляху Worker (metadata
проєктів, пайплайни, конфіги агентів). Appwrite DB — для embeddings та
будь-яких даних, прив'язаних до Appwrite-користувача (auth, billing, секрети).
Worker звертається до Appwrite через REST (`APPWRITE_DATABASE_ID=ai-drakon`,
`APPWRITE_KB_COLLECTION_ID=kb_embeddings`).

---

## 4. Інваріанти (незмінні)

- `drakonwidget.js`, `src/lib/drakon/adapter.ts` — недоторкані.
- IR без X/Y; `params` — STRING; b0: type="branch", branchId=0 (число).
- Псевдокод зберігає мітки `:: tool :: / :: llm ::` і гілки `(one)/(two)`.
- Жоден D1-запит без `WHERE tenant_id = ?`.
- Секрети зон — тільки Appwrite encrypted attribute / CF Secrets.
- `npx tsc --noEmit` чистий після кожного етапу; `src/` ↔ `.lovable/src/`.

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[ARCHITECTURE-SAAS]] — пов'язаний документ (ARCHITECTURE SAAS)
- [[krytyka]] — пов'язаний документ (krytyka)
---
tags:
  - domain:meta
  - status:active
  - format:guide
created: 2026-05-28
updated: 2026-06-17
tier: 1
title: "Керівництво по спільній роботі Claude та AGY"
lang: uk
---

# Керівництво по спільній роботі Claude та AGY — Claude+AGY Collaboration Guide

## 1. Огляд — Тандем Claude та AGY
Проєкт AI-DRAKON використовує потужний гібридний мультиагентний тандем для ефективного виконання завдань з інженерії програмного забезпечення, поєднуючи високоякісну оркестрацію з економічно вигідною реалізацією.

- **Claude (Sonnet 4.6)** виступає як **оркестратор (orchestrator)**: відповідає за високорівневе планування, проектування архітектури, перевірку коду (code review) та написання детальних специфікацій.
- **AGY (Gemini 2.5 Pro, запущений в Android/Termux)** виступає як **виконавець (executor)**: вирішує конкретні завдання з реалізації коду, запускає команди в терміналі, оновлює черги завдань та робить push-коміти в Git.
- **Q (Людина)** виступає як **власник продукту (product owner)**: визначає напрямок розвитку продукту, переглядає та підтверджує ключові рішення, а також активує та запускає виконавця AGY.
- **Обґрунтування**: Такий поділ оптимізує витрати та використання токенів. Запуск складного логічного аналізу безпосередньо через Claude Code може бути дорогим, тоді як Gemini 2.5 Pro через Google Cloud Code на Termux надає високий рівень інтелекту з набагато більшою безкоштовною квотою на виконання.

---

## 2. Інфраструктура
Спільна робота підтримується надійною мережею розподілених серверів, проксі-серверів та служб:

| Компонент | Адреса | Призначення |
|-----------|---------|-------------|
| **Claude Code** | OrangePi (`192.168.3.161:3456`) | Головний агент-оркестратор |
| **AGY CLI (phone)** | Termux (динамічний IP, ~192.168.3.25) | Прості Termux bash/git задачі (НЕ Python agents — їх видалено як сервіси; bash/git у Termux лишається) |
| **AGY3 (tablet)** | Termux (`192.168.3.204:8022`) | **Основний виконавець**: складні TypeScript/SSH задачі |
| **AGY Proxy** ⚠️ DEPRECATED | ~~`https://agy.exodus.pp.ua`~~ | **DEPRECATED**: замінено на `llm-gateway` Appwrite Function. Більше НЕ використовувати як LLM endpoint. |
| **drakon-antigravity-worker** | `drakon-antigravity-worker.maxfraieho.workers.dev` | **Головний CF Worker**: MCP зони знань, KB vector search (CF Workers AI BGE), MinIO, профілі памʼяті |
| **architect-agent-flue** | `architect-agent-flue.maxfraieho.workers.dev` | CF Worker: компілятор DRAKON IR → Flue workflow (live) |
| **docs-agent-flue** | `docs-agent-flue.maxfraieho.workers.dev` | CF Worker: документація + `kb_search`/`kb_index` MCP tools (live) |
| **llm-gateway** | Appwrite Function (`6a3200cd00182e876067.fra.appwrite.run`) | LLM проксі failover: NIM→NIM2→OpenRouter→Gemini 2.5 Flash |
| **semantic-graph** | Appwrite Function (`6a32155a001560ddd02f.fra.appwrite.run`) | Async 900s: GitHub API → llm-gateway → wikilinks |
| **Appwrite Cloud** | `fra.cloud.appwrite.io` (project `6a23420a003a04b4997b`) | Auth, DB (`kb_embeddings` 768-dim BGE), Functions |
| **Dev Server** | `192.168.3.184` | ai-memory, MemPalace, допоміжні сервіси |
| **ai-memory** | `192.168.3.184:49374` | Рівень синхронізації сесій між агентами |
| **MemPalace** | `192.168.3.184` (Python) | Семантична пам'ять, ведення щоденників та граф знань (KG) |
| **Archivist AI** (NotebookLM MCP) | `192.168.3.234:8002` | Довгострокова база знань проекту (104 ноутбуки) |
| **cloudflared** | OrangePi native | Публічний безпечний тунель, що відкриває доступ до внутрішніх служб |

---

## 3. Трирівнева система пам'яті
Для забезпечення довгострокової узгодженості, безперервності роботи та безперешкодного обміну контекстом архітектура реалізує трирівневу систему пам'яті:

### Рівень 1 — Оперативна пам'ять (MemPalace)
- **Технологія**: Семантичний векторний пошук на базі кастомізованого екземпляра ChromaDB.
- **Компоненти**:
  - **Щоденник (Diary)**: Індивідуальні щоденники для кожного агента (`agent: agt-ogy` для AGY, `agent: claude-code` для Claude).
  - **Граф знань (KG)**: Графове сховище, що зберігає структуровані факти та зв'язки проекту.
  - **Шахта MemPalace (Mine)**: ~21 000 drawers (wing `ai_drakon_scaffolder` = 425 drawers), проіндексованих з кодової бази.
- **Використання**: Запит контексту між активними сесіями, семантичний пошук коду та низькорівневе відстеження завдань.

### Рівень 2 — Синхронізація сесій між агентами (ai-memory)
- **Технологія**: Фонова служба FastAPI, що працює на порту `49374` сервера розробки.
- **Механізм**:
  - Повністю записує вхідні та вихідні дані сесій (prompt/response/thinking) у файли JSONL.
  - Надає кінцеві точки для індексування та пошуку по минулих траєкторіях агентів.
- **Інтеграція**: Автоматичні хук-скрипти `ai-memory-start.sh` та `ai-memory-end.sh` запускаються до та після кожної сесії Termux/AGY, забезпечуючи персистентність логів у `~/workspace/ai-memory-logs/`.

### Рівень 3 — Довгострокова концептуальна пам'ять (Archivist AI)
- **Технологія**: Сервер Model Context Protocol (MCP) з підтримкою потокового HTTP, що працює на Raspberry Pi 4B (`192.168.3.234:8002`).
- **Контекст**:
  - Зберігає канонічні документи (`docs/`), специфікації, посібники з інтеграції та зведені звіти з архітектури.
  - Надає інтерфейс природної мови (RAG) для глибокого концептуального аналізу кодової бази.
- **Використання**: Використовується оркестратором Claude для швидкого вивчення глобальних взаємозв'язків у проекті та пошуку архітектурних рішень.

---

## 4. Специфікація протоколу обміну (Claude ↔ AGY)
Координація та передача завдань між оркестратором та виконавцем відбувається через спеціальні файли черги завдань:

1. **Ініціалізація завдання**: Claude створює або оновлює `development/TASKS.md` зі списком підзавдань, детальним планом впровадження, вимогами до перевірки та очікуваними комітами.
2. **Виконання завдання**:
   - Людина-розробник (Q) копіює завдання з `TASKS.md` та запускає AGY.
   - AGY зчитує ці вимоги, виконує роботу локально в Termux, запускає тести для верифікації та робить push у Git.
3. **Запис у щоденник**: Після кожного завершеного BATCH-завдання AGY робить запис у MemPalace:
   ```bash
   python3 -m mempalace diary write --agent agt-ogy \
     "SESSION:YYYY-MM-DD|TASK-X:task-name|DONE|commit:<hash>|status:<summary>"
   ```
4. **Handoff (Передача контексту)**: AGY оновлює `development/HANDOFF.md` з актуальними хешами комітів, статусом бекенд-сервісів та NotebookLM джерелами.
5. **Синхронізація з Orchestrator**: Claude виявляє нові коміти через `git pull` та зчитує щоденник або файл handoff, щоб підтвердити виконання перед наступним кроком планування.

---

## 5. AGY Task Execution Protocol (деталі)

### Правильний спосіб делегування через OrangePi
- Завжди використовуй `~/bin/delegate-agy.sh "TASK-N"`
- `run_in_background: true` в Bash, БЕЗ `&` в кінці команди
- Результат: `~/agy-task.log` на AGY + запис у diary `agt-ogy`

### Критичне правило для TASKS.md
Кожна задача **ОБОВ'ЯЗКОВО** повинна містити наступний рядок:
> "!!IMPORTANT!!: Run locally on THIS Termux device. NO SSH to 192.168.3.184 for diary/mempalace."
Без цього застереження AGY може спробувати підключитися до dev-сервера для взаємодії з `mempalace` (якого там насправді немає).

### Розташування та локальність MemPalace
- **OrangePi**: локальний процес (запущений як MCP-сервер, що обслуговує ~21000 drawers).
- **AGY phone / AGY3 tablet**: локальний процес в Termux (кожен пристрій має власну локальну БД, але вони синхронізовані через логи щоденника/diary).
- **Dev Server (192.168.3.184)**: `mempalace` тут **НЕ встановлено** — AGY в жодному разі не повинен звертатися туди для операцій з пам'яттю.

---

## 6. Паралельне виконання (AGY + AGY3)

Для підвищення ефективності розробки завдання можуть виконуватися паралельно на двох різних пристроях:

| Інстанс | Хост | SSH-доступ | Quota / Особливості |
|---------|------|------------|---------------------|
| **AGY phone** | `192.168.3.25` (динамічний) | `u0_a284:123456` порт `8022` | змінна квота (основний телефон) |
| **AGY3 tablet** | `192.168.3.204` (статичний) | `u0_a410:TermuxSsh2026!` порт `8022` | 100% квота (виділений планшет) |

Обидва середовища повністю ідентичні та містять:
- Встановлений `agy` CLI та проксі
- Скрипти `agy-task.sh` / `ai-memory-start.sh` / `ai-memory-end.sh`
- Локальний клон репозиторію `ai-drakon-scaffolder` з налаштованими Git credentials

**Рекомендація**: Делегуйте взаємонезалежні завдання з `TASKS.md` на різні пристрої одночасно для максимального розпаралелювання.

---

## 7. Верифікація після виконання AGY-задачі

Ніколи не покладайтеся виключно на текстовий звіт виконавця. Після завершення задачі оркестратор Claude має виконати наступні перевірки:
1. **Аналіз Git комітів**: перевірити `git log --oneline -3` (чи дійсно з'явилися нові коміти з потрібним описом).
2. **Перевірка статусу задачі**: перевірити `grep "\[x\] TASK-N" development/TASKS.md`.
3. **Аналіз Щоденника (Diary)**: виконати `mempalace_diary_read(agent_name="agt-ogy", last_n=3)` через MCP для валідації запису.
4. **Код-рев'ю змін**: перевірити безпосередньо змінені файли коду (НЕ довіряти AGY-звіту без фактичного аналізу дифу).

---

## 8. Доступ до інфраструктури
Для адміністрування та взаємодії між вузлами використовуються такі облікові дані та порти:

- **AGY Termux SSH**: `sshpass -p "123456" ssh -p 8022 u0_a284@192.168.3.195`
- **Dev Server SSH**: `sshpass -p "805235io." ssh vokov@192.168.3.184`
- **RPi 4B SSH (NotebookLM MCP)**: `sshpass -p "805235io." ssh vokov@192.168.3.234`
- ~~**Адреса AGY Proxy**: `https://agy.exodus.pp.ua`~~ ⚠️ **DEPRECATED** — LLM-запити йдуть через `llm-gateway` Appwrite Function, не через цей проксі.

---

## 9. База знань Archivist AI (Notebook Sources)
Archivist AI (NotebookLM MCP, `192.168.3.234:8002`) обслуговує 104 ноутбуки. У ноутбуці `drn-ai` зареєстровані та оновлюються такі ключові джерела:

1. `GEMINI.md 2026-05-28` — Канонічний опис платформи та інструкції.
2. `docs/COLLABORATION.md` — Цей посібник з архітектури та взаємодії.
3. `development/TASKS.md` — Живий реєстр усіх завдань та спринтів.
4. `MemPalace Diary` — Зведений семантичний лог роботи AGY.

---

## 10. Інфраструктура Cloudflare
Усі розробницькі ендпоінти та мікросервіси безпечно опубліковані у веб за допомогою нативного тунелю Cloudflare.

- **ID тунелю**: `7c2d896d-2c77-4486-af56-ef30969ca942` (працює нативно на OrangePi)
- **Шлях конфігурації**: `/etc/cloudflared/config.yml`

### Довідник публічних адрес
- `aidrakon.tech` ➔ Продакшн фронтенд (Cloudflare Pages, деплой з `.lovable/`)
- `drakon-antigravity-worker.maxfraieho.workers.dev` ➔ Головний CF Worker (MCP зони знань, KB vector search, MinIO, профілі памʼяті)
- `architect-agent-flue.maxfraieho.workers.dev` ➔ CF Worker: компілятор DRAKON IR → Flue workflow
- `docs-agent-flue.maxfraieho.workers.dev` ➔ CF Worker: документація (`kb_search`/`kb_index`)
- ~~`agy.exodus.pp.ua`~~ ➔ Termux AGY проксі (`:8080`) — ⚠️ **DEPRECATED**: LLM-проксі замінено на `llm-gateway` Appwrite Function (`6a3200cd00182e876067.fra.appwrite.run`). Тунель лишається тільки для прямого SSH-делегування задач на AGY.
- `claude2.exodus.pp.ua` ➔ OrangePi Claude Code (`:3456`)
- `garden-mcp.exodus.pp.ua` ➔ Ендпоінт MCP-сервера (`:8081`)
- `notebooklm.exodus.pp.ua` ➔ Archivist AI (NotebookLM MCP, `:8002`)
- `ssh.exodus.pp.ua` ➔ Безпечний тунель SSH (`:22`)

---

## 11. Конфігурація агентів AI-DRAKON
Фронтенд-додаток (`ai-drakon-scaffolder`) містить трьох спеціалізованих фонових агентів, які налаштовуються у вкладці **Налаштування** (Settings) фронтенду, де вказуються їхні Cloudflare Workers URL:

- **Architect Agent URL** ➔ `https://architect-agent-flue.maxfraieho.workers.dev`
- **Docs Agent URL** ➔ `https://docs-agent-flue.maxfraieho.workers.dev`
- **Knowledge / Main Worker URL** ➔ `https://drakon-antigravity-worker.maxfraieho.workers.dev`

Воркери використовують Flue Runtime для виконання відповідних дій та інструментів.
`drakon-agent-flue` видалений — його функції перенесені в `drakon-antigravity-worker`.

---

## 12. Дорожня карта — Хмарна міграція

Перехід від Python-агентів на dev-сервері до повністю хмарної архітектури (CF Workers + Appwrite Functions). Статус станом на 2026-06-17:

| Phase | Зміст | Стан |
|-------|-------|------|
| **Phase 0** | Інвентаризація, Appwrite project (`6a23420a003a04b4997b`), базовий каркас функцій | ✅ |
| **Phase 1** | `llm-gateway` Appwrite Function: проксі failover NIM→NIM2→OpenRouter→Gemini 2.5 Flash; видалення `services/shared/llm_client.py` | ✅ |
| **Phase 2** | `drakon-antigravity-worker` (MCP зони знань, KB vector search BGE, MinIO, профілі памʼяті); консолідація 3 окремих Workers; видалення `drakon-agent-flue` | ✅ |
| **Phase 3** | `semantic-graph` Appwrite Function (async 900s, GitHub API → llm-gateway → wikilinks); `kb_embeddings` Appwrite DB (768-dim BGE); видалення `services/docs-agent/semantic_graph.py` | ✅ |
| **Phase 4** | Archivist AI → Appwrite Function; консолідація KB в Appwrite | заплановано |

**Що видалено застаріле:** Python agents (`:8765-8767`) на dev-сервері, `services/shared/llm_client.py`, `services/docs-agent/semantic_graph.py`, `drakon-agent-flue` worker, LangGraph (замінено Flue Runtime).

---

## 13. AI-DRAKON як Developer Tool

AI-DRAKON — це не самостійний проект, а **компілятор візуальної мови DRAKON в агентний код** для будь-якого проекту.

### Концепція (2026-06-17, Flue Runtime)
Розробник створює DRAKON-схему → компілятор генерує Flue workflow:
- Sharon UAV Watcher → `threat-classifier.workflow.ts`
- CRM система → `ticket-handler.workflow.ts`
- Будь-яка логіка → типізований TS-агент під цільовий фреймворк

### Pipeline компіляції
```
DRAKON IR (source of truth)
  ↓ Export mRNA  (drakongen.js → pseudocode.ts)
Псевдокод (людино-читаємий текст)
  ↓ Compile with Ribosome  (architect-agent-flue Worker)
  ↓ + KB з Зони Знань (drakon-antigravity-worker MCP)
Flue workflow TypeScript  (артефакт збірки)
  ↓ tsc --noEmit → wrangler deploy
```

### Цільова структура сервісів
```
services/
  architect-agent-flue/   ← CF Worker: DRAKON IR → Flue workflow
    src/tools/ribosome.ts    compilePseudocode()
    POST /compile            → скачати .workflow.ts
  docs-agent-flue/        ← CF Worker: документація + KB MCP
    tools/kb-search.ts       kb_search(), kb_index()
  semantic-graph/         ← Appwrite Function: wiki-links екстракція
    src/collect.ts, extract.ts, budget.ts, render.ts, github.ts
```

### Per-project storage (Appwrite + GitHub)
```
GitHub: docs/{project}/{slug}.md   ← статті KB (git = source of truth)
Appwrite: kb_embeddings collection ← vector embeddings (768-dim BGE)
Appwrite: knowledge_zones          ← MCP endpoint configs per tenant
```

### API (architect-agent-flue Worker)
```
POST /compile      → { pseudocode, nodes[], target } → .workflow.ts
POST /analyze      → DRAKON IR аналіз + валідація
GET  /tools        → список доступних tools для рибосоми
GET  /health       → статус Worker
```

---

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[kb/sync-hooks-methodology]] — пов'язаний документ (sync hooks methodology)
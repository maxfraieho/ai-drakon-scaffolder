---
tags:
  - domain:architecture
  - status:canonical
  - format:guide
created: 2026-06-16
updated: 2026-06-17
tier: 1
title: "06 — Семантичний граф знань (Документознавець + LLM)"
lang: uk
---

# 06 — Семантичний граф знань

> Як Документознавець автоматично будує **семантичні** зв'язки між статтями зони знань
> за допомогою LLM-екстракції графа сутність↔зв'язок, і як це проявляється в UI та
> в серверній логіці системи.

---

## 1. Навіщо це і яку прогалину закриває

База знань AI-DRAKON структурується за **бюджетом зв'язків Zettelkasten** (див.
[[kb/zettelkasten-mempalace-principles]]): кожен листок має ≤ 3–4 зв'язки:

| Тип зв'язку | Хто будує | Стан |
|-------------|-----------|------|
| **Parent MOC** (1 → локальний `_INDEX`/`README`) | механіка `restructure_wiki_graph` | ✅ автоматично |
| **Sequential** (≤1 → наступний нумерований крок) | механіка `restructure_wiki_graph` | ✅ автоматично |
| **Semantic / Related** (≤1–2 → найбільш пов'язані статті з ІНШИХ розділів) | **LLM-Документознавець** | 🆕 ця фіча |

Семантичні крос-секційні зв'язки раніше ставилися **вручну**. Ця підсистема автоматизує
саме їх: Документознавець читає всі статті зони, екстрагує семантичний граф і матеріалізує
1–2 найкращі зв'язки як `[[wiki-посилання]]` у секції «Семантичні зв'язки» кожної статті.

---

## 2. Методика (адаптація KG-екстракції під наш LLM-проксі)

Базується на методиці «tabular extraction» (Entity + Relationship за один запит). Адаптація:

| Поняття методики | У нашій системі |
|------------------|-----------------|
| Entity `{id, name, label}` | **Стаття зони**: `id`=індекс, `name`=title, `label`=розділ (`folder`) |
| Relationship `{source_id, link, target_id}` | **Семантичний зв'язок між статтями**; `link` — `snake_case` предикат (`prerequisite_of`, `extends`, `implements`, `relates_to`, `contrast_to`, `example_of`) |
| «Use ONLY the input data» | Жорстко: лише надані title+summary; заборона вигаданих статей/слагів |
| Детермінізм (`temperature=0`) | через llm-gateway Appwrite Function (`temperature=0`) |
| Бюджет зв'язків | ≤2 семантичні на статтю, **лише крос-секційні** (різний `folder`) |
| Масштабування (chunking + merge) | для зон > ~40 статей — батчинг вікнами + дедуп за slug |

**Ключове:** граф НЕ зберігається окремо як структура — він **матеріалізується у `[[links]]`**.
Вузли/ребра візуалізуються вʼювером на льоту (див. §4).

---

## 3. Серверна логіка (backend)

### 3.1 LLM-проксі — наші моделі
Усі виклики йдуть через **llm-gateway** (Appwrite Function,
`6a3200cd00182e876067.fra.appwrite.run`, token `freecc`) — проксі з failover-ланцюгом
NIM→NIM2→OpenRouter→Gemini 2.5 Flash. Детермінізм забезпечується `temperature=0`.
Жодного прямого Gemini SDK і жодного `llm_client.py` — лише llm-gateway.
(`services/shared/llm_client.py` DEPRECATED, замінений llm-gateway.)

### 3.2 Ядро екстракції — Appwrite Function `semantic-graph` (`services/semantic-graph/src/`)
Чисті, тестовані TypeScript-модулі (`services/docs-agent/semantic_graph.py` DEPRECATED):

| Модуль | Призначення |
|--------|-------------|
| `github.ts` | читання статей зони через GitHub API → `[{id, slug, title, folder, summary}]` (summary ≈ перші 600 символів body) |
| `collect.ts` | нормалізація зібраних статей, дедуп, підготовка вхідних даних для екстракції |
| `extract.ts` | system+user промпт + виклик llm-gateway: лише вхідні дані, snake_case, бюджет ≤2, крос-секційність; парс JSON, валідація id, відкид self/дублів і **внутрішньо-секційних** ребер |
| `budget.ts` | лишити ≤2 вихідних семантичних на статтю |
| `render.ts` | згенерувати підблок «Цей документ пов'язаний з:» та замінити ЛИШЕ його, зберігши «Цей документ є частиною:» (Parent MOC) |

### 3.3 Ендпоінт — `drakon-antigravity-worker` → Appwrite Function (async)
`POST /v1/notes/semantic-graph?project=&apply=&model=` (на drakon-antigravity-worker),
який диспетчерить запит у Appwrite Function `semantic-graph` (async, до 900s):
1. `github.ts` (collect) → `extract.ts` (промпт + llm-gateway, `temperature=0`)
2. `budget.ts` (enforce link budget)
3. `render.ts` (upsert semantic section) для кожної зміненої статті
4. **`apply=false`** (дефолт) → повертає прев'ю diff-ів `{proposed:[{slug, before, after}], stats}`
5. **`apply=true`** → запис через GitHub API → нормалізація → git commit/push
   `docs(graph): semantic links for <project>`

### 3.4 Джерело правди = git-markdown (НЕ Appwrite)
Статті зберігаються як `docs/<project>/<slug>.md` у git. **Окремого зберігання графа в
Appwrite немає** — це свідоме архітектурне рішення: `[[wikilinks]]` у markdown є єдиним
джерелом правди, а окремий стор спричинив би дивергенцію стану. Будь-яка зміна **оборотна
через git** (`git revert`).

### 3.5 Дані для вʼювера — `notes_graph` (GET `/notes/graph`)
Будує `{nodes, edges, stats}` із `[[links]]`. Ребра тегаються `type`:
`"semantic"` (з підблоку «пов'язаний з»), інакше `"structural"`/`"navigational"`.

---

## 4. UI (вкладка «Документація»)

### 4.1 Вʼювер графа — `src/components/docs/garden/ExecutionGraph.tsx`
SVG force-directed граф (zoom/pan, пошук, depth-slider, focus-mode). Семантичні ребра
(`type:"semantic"`) фарбуються окремо (пунктир), щоб відрізнятись від структурних.

### 4.2 Тригер — `src/pages/GardenPage.tsx`
Кнопка **«Побудувати семантичні зв'язки»**:
`buildSemanticGraph(project, apply=false)` → модалка **прев'ю diff** (які `[[links]]`
додаються) → **«Застосувати»** → `apply=true` → інвалідація `GET /notes/graph` →
граф оновлюється наживо.

### 4.3 Рендер посилань — `NoteRenderer.tsx`
`[[wiki-посилання]]` рендеряться клікабельними у тілі статті.

---

## 5. Потік даних (end-to-end)

```
Клієнт (GardenPage) ──POST /v1/notes/semantic-graph?apply=false──▶ drakon-antigravity-worker
   worker ──dispatch──▶ Appwrite Function semantic-graph (async ≤900s)
      github.ts (collect через GitHub API) → extract.ts (промпт + llm-gateway, temp=0)
            → budget.ts → render.ts (upsert, in-memory)
   ◀────────────── proposed diffs (прев'ю) ──────────────
Клієнт «Застосувати» ──apply=true──▶ semantic-graph: запис .md через GitHub API → нормалізація
            → git commit/push (оборотно)
   ◀── GET /v1/notes/graph (edges з type:"semantic") ──▶ ExecutionGraph (пунктирні ребра)
```

---

## 6. Реалізація та задачі

- Повний план реалізації: [[plans/2026-06-16-semantic-knowledge-graph-docs-agent]]
- Розбивка по TASK-ах для агентного флоту: [[plans/2026-06-16-semantic-knowledge-graph-TASKS]]
- Виконавча модель: Claude Sonnet 4.6 (через AGY-флот).

---

## Семантичні зв'язки
**Цей документ є частиною:** [[architecture/_INDEX]]

**Цей документ пов'язаний з:**
- [[concept/06-knowledge-base]] — пов'язаний документ (06 knowledge base)
- [[concept/08-agent-docs-integration]] — пов'язаний документ (08 agent docs integration)
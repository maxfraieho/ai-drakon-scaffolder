---
tags:
  - domain:architecture
  - status:canonical
  - format:guide
created: 2026-06-16
updated: 2026-06-16
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
| Детермінізм (`temperature=0`) | через `services/shared/llm_client.py` (`chat(..., temperature=0)`) |
| Бюджет зв'язків | ≤2 семантичні на статтю, **лише крос-секційні** (різний `folder`) |
| Масштабування (chunking + merge) | для зон > ~40 статей — батчинг вікнами + дедуп за slug |

**Ключове:** граф НЕ зберігається окремо як структура — він **матеріалізується у `[[links]]`**.
Вузли/ребра візуалізуються вʼювером на льоту (див. §4).

---

## 3. Серверна логіка (backend)

### 3.1 LLM-проксі — наші моделі
Усі виклики йдуть через уніфікований клієнт `services/shared/llm_client.py` →
проксі `LLM_BASE_URL` (дефолт `https://agy.exodus.pp.ua`, Anthropic-формат `/v1/messages`).
Модель налаштовується через env `LLM_MODEL` (дефолт — Flash-клас, дешева). Жодного
прямого Gemini SDK — лише наш проксі.

### 3.2 Ядро екстракції — `services/docs-agent/semantic_graph.py`
Чисті, тестовані функції:

| Функція | Призначення |
|---------|-------------|
| `collect_articles` | зібрати `[{id, slug, title, folder, summary}]` (summary ≈ перші 600 символів body) |
| `build_extraction_prompt` | system+user промпт: лише вхідні дані, snake_case, бюджет ≤2, крос-секційність |
| `parse_relationships` | парс JSON, валідація id, відкид self/дублів і **внутрішньо-секційних** ребер |
| `enforce_link_budget` | лишити ≤2 вихідних семантичних на статтю |
| `render_semantic_block` | згенерувати підблок «Цей документ пов'язаний з:» з чистими шляхами |
| `upsert_semantic_section` | замінити ЛИШЕ цей підблок, зберігши «Цей документ є частиною:» (Parent MOC) |

### 3.3 Ендпоінт Документознавця — `services/docs-agent/notes_route.py`
`POST /notes/build-semantic-graph?project=&apply=&model=`:
1. `collect_articles` → `build_extraction_prompt` → `chat(temperature=0)`
2. `parse_relationships` → `enforce_link_budget`
3. `upsert_semantic_section` для кожної зміненої статті
4. **`apply=false`** (дефолт) → повертає прев'ю diff-ів `{proposed:[{slug, before, after}], stats}`
5. **`apply=true`** → запис → `restructure_wiki_graph` (нормалізація) → git commit/push
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
Клієнт (GardenPage) ──POST /notes/build-semantic-graph?apply=false──▶ docs-agent
   docs-agent: collect_articles → build_prompt → llm_client.chat(temp=0) [наш проксі]
            → parse → enforce_budget → upsert (in-memory)
   ◀────────────── proposed diffs (прев'ю) ──────────────
Клієнт «Застосувати» ──apply=true──▶ docs-agent: запис .md → restructure_wiki_graph
            → git commit/push (оборотно)
   ◀── GET /notes/graph (edges з type:"semantic") ──▶ ExecutionGraph (пунктирні ребра)
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
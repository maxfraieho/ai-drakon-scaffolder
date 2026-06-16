---
title: "План: Семантичний граф знань через Документознавця (KG-екстракція)"
tags: [plan, docs-agent, knowledge-graph, wikilinks, zettelkasten, llm]
updated: "2026-06-16"
---

# План реалізації: Семантичний граф знань (Документознавець + LLM)

> **Виконавець:** Claude Sonnet 4.6 (легша модель). Цей план самодостатній — НЕ потребує
> попереднього контексту. Усі шляхи відносні до кореня репо `ai-drakon-scaffolder`.
>
> **Автор плану:** Claude (Opus), на основі індексів GitNexus + читання реального коду
> + методики `docs/knowledge_graph_generation.ipynb` (Google "Building KG with Gemini").

---

## 0. Суть у двох реченнях

Документознавець (`services/docs-agent`) вже автоматично будує **структурні** wiki-зв'язки
(Parent MOC + Sequential) через `restructure_wiki_graph`. Цей план додає **семантичний шар**:
LLM читає всі статті зони знань, екстрагує граф сутність↔зв'язок (методика з ноутбука,
адаптована під **наш LLM-проксі**, а не Gemini), і вставляє 1–2 контекстуальні `[[посилання]]`
у секцію `## Семантичні зв'язки` кожної статті — згідно з уже задокументованим **бюджетом
зв'язків** (`docs/kb/zettelkasten-mempalace-principles.md`). Існуючий вʼювер графа
відображає їх автоматично.

**ЦЕ НЕ greenfield.** Більшість інфраструктури вже є. Ми заповнюємо одну прогалину:
семантичні крос-секційні зв'язки зараз ставляться вручну — автоматизуємо їх.

---

## 1. Що ВЖЕ існує (не переписувати — інтегруватися)

### Бекенд — `services/docs-agent/notes_route.py`
| Символ | Рядки | Що робить |
|--------|-------|-----------|
| `_WIKILINK_RE` | ~38 | regex `[[target]]` / `[[target\|alias]]` |
| `_parse_wikilinks(content)` | 79–83 | витягує слаги, пропускає code-fences |
| `_flat_notes(root, project)` | ~ | плоский список нотаток (slug/title/path/folder) |
| `_resolve_root(project)` | ~ | scoped корінь docs для проекту/зони |
| `_strip_frontmatter`, `_extract_title` | ~ | утиліти |
| `restructure_wiki_graph(docs_root, project)` | 200–330 | **МЕХАНІЧНА** перебудова: Parent MOC + Sequential + INDEX. Працює з секцією `## Семантичні зв'язки`, але семантичні лінки НЕ генерує — лише зберігає/нормалізує наявні. |
| `restructure_notes` (POST `/notes/restructure`) | 433–463 | ручний тригер `restructure_wiki_graph` + git commit/push |
| `notes_graph` (GET `/notes/graph`) | 467–525 | дані вʼювера: `{nodes:[{slug,title,exists}], edges:[{source,target,type}], stats}`. Ребра з `[[links]]`. Поле `type` зараз завжди `"navigational"`. |
| `write_note` (POST `/notes/write`) | ~36 | запис нотатки + auto `restructure_wiki_graph` + git push |

> **Зберігання статей = markdown-файли в git** (`docs/<project>/<slug>.md`), не Appwrite.
> Запис іде через `_git_commit_push` (Python) або GitHub API (`notes-crud.ts` flue-twin).
> **Будь-яка зміна оборотна через git.**

### LLM-проксі (наші моделі) — `services/shared/llm_client.py`
```python
from llm_client import chat   # services/shared у PYTHONPATH агентів
text = chat(
    messages=[{"role": "user", "content": "..."}],
    system="...",
    model=os.getenv("LLM_MODEL", "gemini-2.5-flash"),  # override env-ом
    max_tokens=4096,
)
```
- Базовий URL: `LLM_BASE_URL` (дефолт `https://agy.exodus.pp.ua`), формат Anthropic `/v1/messages`.
- **Це уніфікований клієнт — використовуй ЙОГО** (не `docs_chat`, який заточений під чат).
- Детермінізм: проксі не приймає `temperature` у поточному `chat()` — додамо опц. параметр (Фаза 1).

### Фронтенд — вʼювер графа (вкладка «Документація»)
| Файл | Роль |
|------|------|
| `src/pages/GardenPage.tsx` (`GardenPage` 103–362; `extractWikilinks` 21–27; `enrichWithWikilinks` 64–85) | сторінка саду нотаток |
| `src/components/docs/garden/ExecutionGraph.tsx` (`stepSimulation` 94–140) | SVG force-graph (адаптований з bloom `GlobalGraphView`) |
| `src/components/docs/garden/NoteRenderer.tsx` (`NoteRenderer` 14–87) | рендерить `[[wikilinks]]` як клікабельні |
| `import/garden-bloom/**` | **референс-копії з bloom** (НЕ редагувати; правила адаптації в `import/garden-bloom/README.md`) |
| `src/lib/api.ts` (`listKnowledgeZones` 325, `runDocsDocument` 315) | API-клієнт |

### Бюджет зв'язків — `docs/kb/zettelkasten-mempalace-principles.md` (ДОТРИМУВАТИСЬ СУВОРО)
- **Parent MOC**: рівно 1 → локальний `_INDEX`/`README` (робить механіка).
- **Sequential**: ≤1 → наступний нумерований крок (робить механіка).
- **Semantic/Related**: **≤1–2** → найбільш повʼязані статті з ІНШИХ розділів ← **ЦЕ НАШ LLM**.
- Разом ≤ 3–4 вих/вх звʼязки на листок.
- Чисті шляхи: `[[kb/_INDEX]]`, БЕЗ `docs/` і БЕЗ `.md`.
- Формат секції (взяти з низу самого принципів-документа):
  ```markdown
  ## Семантичні зв'язки
  **Цей документ є частиною:** [[kb/_INDEX]]

  **Цей документ пов'язаний з:**
  - [[agents/agy/01-docs-agent/SKILL]] — короткий опис зв'язку
  ```

---

## 2. Методика (адаптація ноутбука під нашу систему)

Джерело: `docs/knowledge_graph_generation.ipynb.txt`. Беремо принципи, відкидаємо Gemini/networkx.

| Принцип ноутбука | Наша адаптація |
|------------------|----------------|
| Entity `{id,name,label}` | **Entity = стаття зони.** `id`=індекс, `name`=title, `label`=тека/розділ (`folder`). |
| Relationship `{source_id,link,target_id}` | **Relationship = семантичний звʼязок між статтями.** `link` = `snake_case` предикат (`extends`, `prerequisite_of`, `implements`, `relates_to`, `contrast_to`). |
| «Use ONLY the input data» | Жорстко: модель оперує ЛИШЕ наданими title+summary статей. Заборонити вигадані статті/слаги. |
| Tabular/TSV output (економія токенів) | Просимо **JSON** (простіше парсити в Python; зони малі — токени не критичні). Якщо зона >40 статей — TSV (Фаза 4). |
| Детермінізм `temp=0, seed=42` | `temperature=0` через `chat()` (додаємо параметр). |
| Симетричні/асиметричні звʼязки | Дозволяємо асиметрію; при вставці беремо звʼязок із боку source. |
| Chunking великих книг + merge графів | **Chunking зони:** якщо статей багато — батчимо вікнами + дедуп за slug (Фаза 4). |

**Вузол НЕ для людей/тварин, а для статей.** Граф будуємо НЕ networkx-ом — лише матеріалізуємо
ребра як `[[links]]` у markdown; візуалізацію вже робить `ExecutionGraph` на льоту.

---

## 3. Архітектурні рішення (зафіксовано)

1. **Без окремого зберігання графа в Appwrite.** Джерело правди = `[[wikilinks]]` у git-markdown.
   Окремий стор → дивергенція. Предикат кодуємо в markdown; вʼювер тегає ребро `type:"semantic"`.
2. **Запис = git (оборотно).** Режим за замовчуванням: **dry-run → preview-diff → apply**.
   `apply` комітить окремим повідомленням `docs(graph): semantic links for <project>`.
3. **Модель — дешева, налаштовувана.** Дефолт `LLM_MODEL` (Flash-клас). Клієнт може підняти.
4. **Власник фічі — Документознавець.** Новий ендпоінт у `docs-agent`, не новий сервіс.
5. **Семантичні лінки НЕ затирають структурні.** Пишемо лише в підблок «пов'язаний з»;
   Parent MOC лишає механіка. Перед записом викликаємо існуючий `restructure_wiki_graph`,
   ПОТІМ додаємо семантичні — щоб не конфліктувати з нумерацією бюджету.

---

## 4. Фази реалізації

### Фаза 1 — LLM-клієнт: підтримка `temperature`
**Файл:** `services/shared/llm_client.py`
- Додати параметр `temperature: float | None = None` у `chat()`; якщо не `None` — покласти в `payload`.
- **Перевірка:** `python -c "from llm_client import chat; print(chat([{'role':'user','content':'ping'}], max_tokens=10))"` (з `services/shared` у PYTHONPATH) повертає текст без помилки.

### Фаза 2 — Ядро екстракції (новий модуль)
**Новий файл:** `services/docs-agent/semantic_graph.py`

Функції (чисті, тестовані окремо):

```python
def collect_articles(docs_root: Path, project: str | None) -> list[dict]:
    """[{id, slug, title, folder, summary}] — summary = перші ~600 символів body без frontmatter.
    Перевикористати _flat_notes + _strip_frontmatter з notes_route."""

def build_extraction_prompt(articles: list[dict]) -> tuple[str, str]:
    """Повертає (system, user). System фіксує: лише вхідні дані; snake_case предикати;
    бюджет ≤2 семантичних на статтю; крос-секційність (різні folder); вихід — JSON
    {relationships:[{source_id, link, target_id}]}. Перелік slug↔id у user-повідомленні."""

def parse_relationships(llm_text: str, articles: list[dict]) -> list[dict]:
    """Витягти ```json ... ```; провалідувати id у діапазоні; відкинути self-links та
    дублі; ВІДКИНУТИ ребра де source.folder == target.folder (не крос-секційні)."""

def enforce_link_budget(rels: list[dict], articles: list[dict], max_per_node: int = 2) -> list[dict]:
    """Лишити ≤max вихідних семантичних на статтю; ранжування — порядок від LLM."""

def render_semantic_block(slug: str, rels: list[dict], articles: list[dict]) -> str:
    """Згенерувати підблок:
       **Цей документ пов'язаний з:**
       - [[<clean-target-slug>]] — <link предикат людською мовою>
    Шляхи чисті (без docs/ і .md). Не чіпати рядок 'Цей документ є частиною:'."""

def upsert_semantic_section(content: str, semantic_block: str) -> tuple[str, bool]:
    """Якщо є '## Семантичні зв'язки' — замінити ЛИШЕ підблок 'пов'язаний з'
    (regex), зберігши 'є частиною'. Інакше — додати повну секцію в кінець.
    Повертає (new_content, changed)."""
```

**Перевірка:** окремий тест `services/docs-agent/tests/test_semantic_graph.py` з фейковим
LLM-виходом → `parse_relationships` + `enforce_link_budget` + `upsert_semantic_section`
дають очікуваний markdown (1 тест за раз, дивись Testing Protocol нижче).

### Фаза 3 — Ендпоінт у Документознавці
**Файл:** `services/docs-agent/notes_route.py` (додати в кінець, біля `restructure_notes`)

```python
@router.post("/build-semantic-graph")
def build_semantic_graph(
    project: Optional[str] = Query(default=None),
    apply: bool = Query(default=False, description="False=dry-run preview, True=write+commit"),
    model: Optional[str] = Query(default=None),
):
    """Документознавець: екстрагує семантичний граф зони та вставляє ≤2 крос-секційні
    [[links]] у секцію 'Семантичні зв'язки' кожної статті.
    dry-run повертає proposed diffs; apply — записує + git commit/push."""
```

Логіка:
1. `root = _resolve_root(project)`; `articles = collect_articles(root, project)`.
2. `system, user = build_extraction_prompt(articles)`.
3. `from llm_client import chat` → `chat([{user}], system=system, temperature=0, model=model or os.getenv("LLM_MODEL"))`.
4. `rels = enforce_link_budget(parse_relationships(text, articles), articles)`.
5. Для кожної статті: `upsert_semantic_section(read, render_semantic_block(...))`.
6. **dry-run:** повернути `{success, model, proposed:[{slug, diff|before|after}], stats}`.
7. **apply:** записати змінені файли → `restructure_wiki_graph(root, project)` (нормалізація) →
   git add/commit `docs(graph): semantic links for <project>`/push (патерн з `restructure_notes`).

**Перевірка (dry-run, без запису):**
```bash
curl -s "http://localhost:<docs-agent-port>/notes/build-semantic-graph?project=ai-drakon&apply=false" | jq '.stats, .proposed[0]'
```
Очікувати: `proposed` непорожній, у diff лише рядки `- [[...]]` у блоці «пов'язаний з».

### Фаза 4 — Масштабування (лише якщо зона > ~40 статей)
- Батчинг `collect_articles` вікнами по ~30 (із summary), злиття `relationships` з дедупом за `(source_id,target_id)`.
- Перемкнути вихід LLM на TSV (`source_id\tlink\ttarget_id`) для економії токенів.
- **Перевірка:** на найбільшій наявній зоні dry-run відпрацьовує без таймауту проксі (60с).

### Фаза 5 — Розрізнення ребер у вʼювері
**Файл:** `services/docs-agent/notes_route.py` → `notes_graph` (467–525)
- Класифікувати ребро: якщо `[[link]]` походить із підблоку «пов'язаний з» → `type:"semantic"`,
  Parent/Sequential → `type:"structural"`, інше → `"navigational"`.
  (Простий шлях: парсити секцію окремо й мапити targets у множину semantic.)

**Файл:** `src/components/docs/garden/ExecutionGraph.tsx`
- Фарбувати/штрихувати ребра за `edge.type` (semantic — інший колір, напр. пунктир).
- **Перевірка:** у вкладці «Документація» після apply семантичні ребра візуально відмінні.

### Фаза 6 — UI-тригер (вкладка «Документація» / пайплайн)
**Файл:** `src/lib/api.ts` — додати клієнт:
```ts
export async function buildSemanticGraph(project?: string, apply = false, model?: string) { /* GET? -> POST */ }
```
(дивитись патерн `runDocsDocument` 315–322 щодо базового URL/JWT.)

**Файл:** `src/pages/GardenPage.tsx`
- Кнопка **«Побудувати семантичні зв'язки»** (поряд з наявним керуванням графом).
- Клік → `buildSemanticGraph(project, apply=false)` → показати модалку прев'ю diff-ів
  (список статей + які `[[links]]` додаються) → кнопка **«Застосувати»** → `apply=true` →
  рефетч `GET /notes/graph` (інвалідація react-query) → граф оновлюється.
- Рядки UI — українською (правило адаптації з `import/garden-bloom/README.md`).

**Перевірка:** клік → прев'ю → застосувати → нові семантичні ребра в `ExecutionGraph`;
`git log --oneline -1` у репо docs показує коміт `docs(graph): semantic links ...`.

### Фаза 7 (опц.) — Крок пайплайну
**Файл:** `services/architect-agent/project_pipeline_route.py` + `services/architect-agent/pipeline/graphs.py`
- Додати node `build_semantic_graph` у відповідний pipeline (патерн `build_analysis_graph` 29–55),
  який викликає docs-agent ендпоінт. Дає «клієнт створює граф із готової зони» через пайплайн.
- **Перевірка:** `services/architect-agent/pipeline/tests/` — новий тест `..._compiles`.

---

## 5. Текст системного промпту (шаблон для Фази 2)

```
You are the Documentarian agent building a SEMANTIC knowledge graph over a set of
knowledge-zone articles. Use ONLY the provided article titles and summaries — never invent
articles, slugs, or facts from outside the input.

Goal: for each article, find AT MOST 2 of the MOST semantically related OTHER articles that
live in a DIFFERENT section (different `folder`). Skip structural/sequential neighbours.

Output strictly:
```json
{"relationships":[{"source_id":<int>,"link":"<snake_case_predicate>","target_id":<int>}]}
```
Rules:
- source_id != target_id; both must exist in the provided id list.
- `link` is a concise snake_case predicate (e.g. prerequisite_of, extends, implements,
  relates_to, contrast_to, example_of).
- Prefer cross-section links (different folder). Do not output more than 2 per source_id.
- If unsure, output fewer links. Quality over quantity.
```
User-повідомлення: пронумерований список `id | folder | title | summary` усіх статей.

---

## 6. Протокол тестування (для виконавця)
- **Один тест за раз.** Написав → запустив → побачив pass → наступний. Без `.skip()`.
- Перед позначенням todo виконаним: `VERIFY: запустив <ім'я тесту> — Результат: PASS/FAIL`.
- dry-run завжди першим; `apply` лише після візуальної перевірки diff.
- Жодних змін у `import/garden-bloom/**` (це референс).

## 7. Відкат
Усе в git. Відкат: `git -C <docs-repo-root> revert <commit>` або
`git checkout <commit>~1 -- docs/<project>/`. Нічого в Appwrite не пишемо.

## 8. Чого НЕ робити
- НЕ створювати Appwrite-колекцію для графа.
- НЕ переписувати `restructure_wiki_graph` (механіку лишаємо; ми поряд).
- НЕ затирати підблок «Цей документ є частиною:» (Parent MOC).
- НЕ перевищувати бюджет 2 семантичних лінки/стаття.
- НЕ використовувати Gemini SDK/networkx — лише `services/shared/llm_client.py` + markdown.
```

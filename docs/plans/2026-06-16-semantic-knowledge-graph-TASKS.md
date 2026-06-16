# TASKS — Семантичний граф знань (Документознавець + LLM)

> Оркестратор: Claude (OrangePi)
> Виконавча модель: **Claude Sonnet 4.6** (через AGY-флот)
> Повний план/контекст: [[plans/2026-06-16-semantic-knowledge-graph-docs-agent]]
> Репо: `maxfraieho/ai-drakon-scaffolder` (гілка `main`)
>
> **Правило для кожного виконавця (перед стартом):**
> 1. `mempalace search "<ключ задачі>"` (контекст минулих рішень) — wing `ai_drakon_scaffolder`.
> 2. GitNexus query/impact на символи, які чіпаєш (repo `ai-drakon-scaffolder`).
> 3. Verify локально → `git commit` (по файлах, НЕ `git add .`) → `git push`.
> 4. push-hook сам викличе `ai-memory-commit.sh` + `mp-index.sh`.
> 5. `python3 -m mempalace diary write --agent <agt> '<SESSION line>'`.

---

## Граф залежностей (оптимальний порядок)

```
TASK-SKG-1 (llm_client temp)
      └─> TASK-SKG-2 (ядро semantic_graph + tests)
                └─> TASK-SKG-3 (endpoint /notes/build-semantic-graph)
                          ├─> TASK-SKG-4 (notes_graph edge type + ExecutionGraph колір)
                          │         └─> TASK-SKG-5 (UI-тригер GardenPage + api.ts + QA)
                          └─> TASK-SKG-6 (опц. крок пайплайну + scaling)
```
- **SKG-1→2→3** — строго послідовно, один виконавець (AGY3), спільний бекенд-контекст.
- **SKG-4** і **SKG-6** незалежні між собою, обидва після SKG-3.
- **SKG-5** після SKG-4 (потрібні семантичні ребра для візуальної перевірки) → QA на AGY2.

---

## TASK-SKG-1: llm_client — підтримка `temperature`

**Виконавець: AGY3 (192.168.3.204)** · fallback: AGY4
**!!IMPORTANT!! Атомарна задача. Лише 1 файл. Без побічних змін.**

### Що зробити
1. У `services/shared/llm_client.py`, функція `chat(...)`:
   - Додати параметр `temperature: float | None = None`.
   - Якщо `temperature is not None` → додати `payload["temperature"] = temperature`.
2. Не змінювати інші сигнатури/дефолти.

### Verify
```bash
cd <repo> && PYTHONPATH=services/shared python3 -c \
"from llm_client import chat; print(chat([{'role':'user','content':'ping'}], max_tokens=10, temperature=0))"
```
Очікувати: текст-відповідь без traceback.

### Diary
```
SESSION:2026-06-16|TASK-SKG-1:llm-client-temperature|services/shared/llm_client.py|commit:<sha>
```

[ ] TASK-SKG-1

---

## TASK-SKG-2: Ядро екстракції `semantic_graph.py` + юніт-тести

**Виконавець: AGY3 (192.168.3.204)** · fallback: AGY4
**!!IMPORTANT!! Залежить від SKG-1. Чисті функції — БЕЗ мережі/LLM у тестах (мокати вхід).**

### Що зробити
Створити `services/docs-agent/semantic_graph.py` з функціями (сигнатури — розділ 4, Фаза 2 плану):
`collect_articles`, `build_extraction_prompt`, `parse_relationships`, `enforce_link_budget`,
`render_semantic_block`, `upsert_semantic_section`.
- Перевикористати з `notes_route.py`: `_flat_notes`, `_strip_frontmatter`, `_parse_wikilinks`, `_resolve_root`.
- Системний промпт — розділ 5 плану. Бюджет ≤2 крос-секційних (різний `folder`), `snake_case` предикат.
- Чисті шляхи в лінках: без `docs/`, без `.md`.
- `upsert_semantic_section`: замінити ЛИШЕ підблок «Цей документ пов'язаний з:», зберігши «є частиною».

Створити `services/docs-agent/tests/test_semantic_graph.py` (по 1 тесту за раз, запускати кожен):
- `test_parse_rejects_same_folder_and_self_links`
- `test_enforce_budget_max_two_per_node`
- `test_upsert_preserves_parent_moc_line`

### Verify
```bash
cd services/docs-agent && python3 -m pytest tests/test_semantic_graph.py -q
```
Очікувати: усі 3 PASS. Перед позначенням готовим: `VERIFY: pytest test_semantic_graph — PASS`.

### Diary
```
SESSION:2026-06-16|TASK-SKG-2:semantic-graph-core+tests|services/docs-agent/semantic_graph.py|3-tests-PASS|commit:<sha>
```

[ ] TASK-SKG-2

---

## TASK-SKG-3: Ендпоінт `POST /notes/build-semantic-graph` (dry-run/apply)

**Виконавець: AGY3 (192.168.3.204)** · fallback: AGY4
**!!IMPORTANT!! Залежить від SKG-2. `apply=False` за замовч. `apply=True` комітить у git (оборотно).**

### Що зробити
У `services/docs-agent/notes_route.py` (біля `restructure_notes`, ~463) додати маршрут
`build_semantic_graph(project, apply=False, model=None)` — логіка 1–7 з Фази 3 плану:
- `chat(...)` з `services/shared/llm_client.py`, `temperature=0`, `model=model or os.getenv("LLM_MODEL")`.
- dry-run → `{success, model, proposed:[{slug, before, after}], stats}`.
- apply → запис змінених файлів → `restructure_wiki_graph(root, project)` → git add(по файлах)/commit
  `docs(graph): semantic links for <project>`/push (патерн `restructure_notes`).

### Verify (dry-run, БЕЗ запису)
```bash
curl -s "http://localhost:$(grep -m1 -oE '180[0-9][0-9]' services/docs-agent/*.py | head -1)/notes/build-semantic-graph?project=ai-drakon&apply=false" | jq '.stats,.proposed[0].slug'
```
Очікувати: `proposed` непорожній; у diff лише рядки `- [[...]]` у блоці «пов'язаний з».

### Diary
```
SESSION:2026-06-16|TASK-SKG-3:build-semantic-graph-endpoint|notes_route.py|dry-run-OK|commit:<sha>
```

[ ] TASK-SKG-3

---

## TASK-SKG-4: Тип ребра `semantic` у вʼювері

**Виконавець: AGY3 (192.168.3.204)**
**!!IMPORTANT!! Залежить від SKG-3. НЕ редагувати `import/garden-bloom/**` (референс).**

### Що зробити
1. `services/docs-agent/notes_route.py` → `notes_graph` (467–525): класифікувати ребро —
   лінки з підблоку «пов'язаний з» → `type:"semantic"`, інакше лишити поточну логіку.
2. `src/components/docs/garden/ExecutionGraph.tsx`: фарбувати/штрихувати ребра за `edge.type`
   (semantic — окремий колір + пунктир).

### Verify
```bash
curl -s ".../notes/graph?project=ai-drakon" | jq '[.edges[].type] | unique'
```
Очікувати: масив містить `"semantic"`. Візуально — пунктирні ребра у вʼювері.

### Diary
```
SESSION:2026-06-16|TASK-SKG-4:semantic-edge-type|notes_route.py+ExecutionGraph.tsx|commit:<sha>
```

[ ] TASK-SKG-4

---

## TASK-SKG-5: UI-тригер у вкладці «Документація» + QA

**Виконавець: AGY3 (реалізація) → AGY2 (QA/браузер, 192.168.3.30)**
**!!IMPORTANT!! Залежить від SKG-4. Рядки UI — українською. AGY2 робить браузер-перевірку.**

### Що зробити (AGY3)
1. `src/lib/api.ts`: `buildSemanticGraph(project?, apply=false, model?)` (патерн `runDocsDocument` 315–322).
2. `src/pages/GardenPage.tsx`: кнопка «Побудувати семантичні зв'язки» →
   `buildSemanticGraph(project,false)` → модалка прев'ю diff → «Застосувати» → `apply=true` →
   інвалідувати react-query `GET /notes/graph` (граф оновлюється).

### Verify (AGY2, браузер)
- Вкладка «Документація» → кнопка → прев'ю показує запропоновані `[[links]]` → «Застосувати» →
  у `ExecutionGraph` зʼявляються нові семантичні (пунктирні) ребра.
- `git log --oneline -1` репо → коміт `docs(graph): semantic links ...`.

### Diary
```
SESSION:2026-06-16|TASK-SKG-5:ui-trigger+QA|GardenPage.tsx+api.ts|browser-verified|commit:<sha>
```

[ ] TASK-SKG-5

---

## TASK-SKG-6 (опц.): Scaling великих зон + крок пайплайну

**Виконавець: AGY4 (fallback AGY3)**
**!!IMPORTANT!! Залежить від SKG-3. Робити ЛИШЕ якщо є зона > ~40 статей або потрібен пайплайн.**

### Що зробити
1. `semantic_graph.py`: батчинг `collect_articles` вікнами ~30 + злиття `relationships`
   з дедупом `(source_id,target_id)`; вихід LLM → TSV для економії токенів.
2. (опц.) `services/architect-agent/pipeline/graphs.py` + `project_pipeline_route.py`:
   node `build_semantic_graph` (патерн `build_analysis_graph` 29–55) → виклик docs-agent ендпоінта.

### Verify
- dry-run на найбільшій зоні — без таймауту проксі (60с).
- Якщо пайплайн: новий тест `..._compiles` у `services/architect-agent/pipeline/tests/` — PASS.

### Diary
```
SESSION:2026-06-16|TASK-SKG-6:scaling+pipeline-node|semantic_graph.py+graphs.py|commit:<sha>
```

[ ] TASK-SKG-6

---

## Примітки для оркестратора
- Спершу ставити в чергу ЛИШЕ SKG-1; SKG-2/3 розблокувати після верифікації попередньої.
- SKG-4 і SKG-6 можна паралелити (різні агенти) ПІСЛЯ SKG-3 — але не на одному терміналі (правило: не кілька bg-задач одночасно на одному агенті).
- Після SKG-5 — синк `.lovable/` якщо змінювались `src/` файли (правило lovable-sync).

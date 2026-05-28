---
tags:
  - domain:agent
  - status:active
  - format:skill
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Навичка AGY: Аналіз репозиторію (Repo Analyzer)"
lang: uk
---

# Навичка AGY: Аналіз репозиторію (Repo Analyzer)

## Призначення

Індексація кодової бази `ai-drakon-scaffolder` в MemPalace та блокнот NotebookLM `drn-ai`.
Запускайте цю навичку, коли дані в MemPalace застаріли або завершено новий спринт розробки фічі.

---

## Умови тригеру (Trigger Conditions)

Запускайте цю навичку, коли:
- Минуло більше 7 днів з моменту останньої індексації.
- Були додані нові коміти Lovable/AGY (перевірте через `git log --oneline -5`).
- Запит `mempalace_search("ai-drakon")` повертає менше 5 результатів.
- Claude або Q явно просять зробити переіндексацію.

---

## Фаза 1 — Перевірка стану Git

```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && git log --oneline -10 && git status --short"
```

Запишіть: хеш останнього коміту, дату, змінені файли.

---

## Фаза 2 — Пакетування через codetomd

```bash
ssh vokov@192.168.3.184 "cd ~/workspace/ai-drakon-scaffolder && python3 scripts/codetomd/codetomd.py"
# Інтерактивно: вкажіть root=. , output=scratch/project_code.md
# Потім скопіюйте локально:
scp vokov@192.168.3.184:~/workspace/ai-drakon-scaffolder/scratch/project_code.md ~/.gemini/antigravity-cli/scratch/
```

Пропускайте директорії (додайте в ігнор codetomd): `.lovable`, `node_modules`, `dist`, `.git`, `src/components/ui`.

---

## Фаза 3 — Вибіркова індексація в MemPalace

Індексуйте покімнатно, а не одним гігантським шматком:

### Room: source-worker
```python
# cloudflare-worker/worker-mcp-drakon.js — огляд карти маршрутів
# Вже проіндексовано Claude — ПЕРЕВІРТЕ СПОЧАТКУ через mempalace_search
```

### Room: source-services
Для кожного сервісу (`drakon-agent`, `architect-agent`, `docs-agent`):
- Прочитайте `main.py` та ключові маршрути (routes).
- Додайте шухляду (drawer): wing=ai-drakon, room=source-services.

### Room: source-lib
Ключові файли: `api.ts`, `graph-pipeline-api.ts`, `htse/ir-types.ts`, `context/ProjectContext.tsx`.

### Room: source-routes
Огляд фронтенд-роутів + макет WorkspaceShell.

### Room: docs
`architecture.md`, `agent-workflow.md`, згенерована документація.

**ПЕРЕД додаванням: завжди спочатку запускайте `mempalace_check_duplicate()`.**

---

## Фаза 4 — Оновлення джерел NotebookLM

Додайте нові або змінені файли до блокнота `drn-ai`:
```bash
# Додати архітектурні документи
notebooklm source add --notebook drn-ai ~/workspace/ai-drakon-scaffolder/docs/architecture.md
notebooklm source add --notebook drn-ai ~/workspace/ai-drakon-scaffolder/docs/agent-workflow.md

# Додати пакет згенерованого коду (стислий)
notebooklm source add --notebook drn-ai ~/.gemini/antigravity-cli/scratch/project_code.md

# Зачекайте обробки
notebooklm source wait --notebook drn-ai --all --timeout 120
```

---

## Фаза 5 — Семантична верифікація

Надішліть запит до MemPalace для підтвердження індексації:
```python
results = mempalace_search("ai-drakon LangGraph architect-agent")
assert len(results) >= 3, "Індексація неповна"

results = mempalace_search("DRAKON IR IrDiagram items")
assert len(results) >= 2, "Типи IR не проіндексовані"
```

Надішліть запит до NotebookLM для підтвердження знань:
```bash
notebooklm ask "drn-ai" "What is the DRAKON IR format?" --json
# Очікується: згадка про IrDiagram, типи IrItem, items Record
```

---

## Формат звіту

```
INDEXING COMPLETE:
- Commits covered: [діапазон хешів]
- MemPalace drawers added: [кількість] у кімнатах [список]
- NotebookLM drn-ai: [додані джерела]
- Verification: [passed/failed]
- Next recommended action: run 01-docs-agent
```

---

## Семантичні зв'язки

**Цей документ є частиною:** [[agents/agy/_INDEX]]
**Цей документ пов'язаний з:**
- [[00-bootstrap/SKILL]] — навичка початкового запуску
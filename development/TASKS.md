# TASKS — Координація Claude ↔ AGY

> Власник: Claude (оркестратор)
> Виконавець: AGY (executor)
> Оновлено: 2026-05-28

## Статуси
- `[ ]` — чекає виконання
- `[~]` — в процесі
- `[x]` — виконано ✅
- `[!]` — заблоковано / потрібна допомога Claude

---

## Черга задач (overnight 2026-05-28)

### TASK-1: Bootstrap — NotebookLM alignment
```
[ ] TASK-1: Запустити 00-bootstrap skill
  - Відкрити NotebookLM notebook drn-ai (ID: 6139067a-5776-4b29-8869-7c9f9aed475c)
  - Задати запит: "Дай огляд поточного стану проекту AI-DRAKON: що реалізовано, які відкриті задачі"
  - Зберегти відповідь в MemPalace (wing: ai_drakon_scaffolder, drawer: "nlm-bootstrap-2026-05-28")
  - Записати результат в diary
```

### TASK-2: Оновити drn-ai notebook
```
[ ] TASK-2: Синхронізувати GEMINI.md до NotebookLM
  - Прочитати ~/workspace/ai-drakon-scaffolder/GEMINI.md
  - Прочитати ~/workspace/ai-drakon-scaffolder/development/HANDOFF.md (якщо є новіший)
  - Додати як source до drn-ai: notebooklm_add_source_text
    title: "GEMINI.md 2026-05-28"
    content: [вміст GEMINI.md]
  - Перевірити що source додано: notebooklm_list_sources
```

### TASK-3: Docs generation pipeline
```
[ ] TASK-3: Запустити 01-docs-agent skill
  - Виконати pipeline для генерації специфікацій
  - Зберегти результати в development/DOCS_GENERATED_2026-05-28.md
  - Записати в diary що зроблено
```

### TASK-4: Session sync handoff
```
[ ] TASK-4: Написати session handoff для Claude
  - Зберегти фінальний стан в MemPalace diary (agent: "agt-ogy")
  - Оновити development/HANDOFF.md з результатами ночі
  - Формат diary: SESSION:2026-05-28|overnight-tasks|DONE:[список]|OPEN:[список]
```

---

## Завершені задачі

```
[x] BUG-8: DRAKON Logic tab у AgentStudioPage ✅ (eac7908, 2026-05-27)
[x] BUG-6: AgentChatPanel wired (c9ab047)
[x] BUG-7: createPipeline() + plus btn (c9ab047)
[x] MemPalace mine: 1439 files → 19 drawers (2026-05-28 00:52)
[x] ChromaDB patch: chroma.py + mcp_server.py + repair.py
```

---

## Протокол AGY після виконання задачі

1. Оновити статус в цьому файлі: `[ ]` → `[x]`
2. Записати в MemPalace diary:
   ```
   python3 -c "
   import subprocess
   subprocess.run(['python3', '-m', 'mempalace', 'diary', 'write',
     'agt-ogy', 'TASK-N:done|summary', '--topic', 'tasks'])
   "
   ```
3. Git commit якщо були зміни у коді:
   ```
   git add development/TASKS.md
   git commit -m "chore(tasks): complete TASK-N"
   ```

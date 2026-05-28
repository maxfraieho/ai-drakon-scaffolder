# AI-Memory vs MemPalace — Дослідження для AI-DRAKON

> Дата: 2026-05-28
> Автор: AGY (Gemini 2.5 Flash) via proxy

## Висновок: ПОРЯД (не замість)

NotebookLM і MemPalace виконують принципово різні ролі.

## Порівняння

| Критерій | MemPalace | NotebookLM |
|----------|-----------|------------|
| Роль | Активна робоча пам'ять агента | Статична аналітична бібліотека |
| Латентність | Низька (ChromaDB, local) | Висока (web API) |
| API для агента | ✅ MCP tools (search, add, diary) | ❌ немає стабільного агентного API |
| Semantic search коду | ✅ (mine 1439 files) | ❌ не призначений |
| Q&A по документах | ⚠️ (обмежено) | ✅ (ідеально) |
| Синтез PDF/статей | ❌ | ✅ |
| Artifacts (podcast, mind map) | ❌ | ✅ |
| Episodic memory (diary) | ✅ | ❌ |
| KG graph | ✅ | ❌ |

## Use Cases

### NotebookLM
- Синтез зовнішньої документації (API docs, whitepapers)
- Audio briefing для швидкого входження в контекст після перерви
- Brainstorming нових ідей на базі завантажених PDF
- Mind maps зв'язків між новими бібліотеками

### MemPalace (незамінна)
- Live coding context: пошук по коду проекту (1439 файлів)
- Agent state: стан LangGraph графів, результати сесій
- KG Graph: залежності React-компонентів, call graph
- Low latency API для агентних запитів

## Схема взаємодії

```
Q (людина)
  ↓ нова технологія/документ
NotebookLM (Бібліотека)
  → Q&A, резюме, план дій
  ↓ ключові інсайти (вручну)
MemPalace (Мозок системи)
  → MemPalace mine (код)
  → diary (сесії)
  → KG (залежності)
  ↓ MCP tools
AGY / Claude (агенти)
  → виконання задач
```

## Рекомендація

**MemPalace = Мозок системи** (активне ядро, LangGraph Tools)
**NotebookLM = Зовнішній консультант** (для людини, не для агента)

Workflow:
1. Агент працює через MemPalace (контекст коду + сесій)
2. Q вивчає нову технологію через NotebookLM (доки → резюме)
3. Q вносить ключові інсайти з NLM в MemPalace (для агента)

## NotebookLM notebooks для проекту

| Notebook | ID | Використання |
|----------|----|-------------|
| drn-ai | 6139067a-5776-4b29-8869-7c9f9aed475c | Головна KB проекту |
| MemPalace | 5551cbff-da12-4c87-b657-9f7c71b59ed6 | API документація |
| AI Drakon Codebase Analysis | 2521c922-efa1-4a12-a106-a8f4d2c386ab | Аналіз коду |

> "AI-Memory" notebook: рекомендується СТВОРИТИ для зберігання
> матеріалів про memory architectures, AGY+Claude collaboration patterns,
> session continuity techniques. AGY: `notebooklm_create_notebook(title="AI-Memory")`

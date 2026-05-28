---
tags:
  - domain:architecture
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "04 — Пайплайни: Pipeline A та Pipeline B"
lang: uk
---

# 04 — Пайплайни: Pipeline A та Pipeline B

## Огляд

Обидва пайплайни реалізовані як **LangGraph StateGraph** в `architect-agent`. Вони запускаються асинхронно: клієнт отримує `job_id`, потім опитує статус через `GET /pipeline/status/{job_id}`.

```
POST /pipeline/analyze  →  job_id  →  GET /pipeline/status/{id}  →  result
POST /pipeline/generate →  job_id  →  GET /pipeline/status/{id}  →  result
```

---

## Pipeline A: Код → DRAKON IR

### Призначення
Отримує Python-код, вимірює складність, будує DRAKON IR з валідацією в циклі (Ralph Loop).

### Граф вузлів

```
measure_cc
    │
classify_complexity
    │
    ├── CC ≤ 10 ──► ast_translate ──► validate
    │                                    │
    └── CC > 10 ──► yaml_gen ──► ir_gen ─►│
                                    ▲    │
                                    │    ├── valid → END
                                    └────┘ invalid + iteration < 3 → ir_gen
                                              invalid + iteration ≥ 3 → END
```

### Вузли детально

**`measure_cc`**
- Вимірює цикломатичну складність через `radon.complexity.cc_visit`
- Повертає `cyclomatic_complexity: int` (максимальний по всіх функціях)

**`classify_complexity`**
- Визначає `tree_level` і `drakon_type`:

| CC | tree_level | drakon_type |
|----|-----------|-------------|
| 1–10 | `primitive` | `Primitive` |
| 11–20 | `silhouette` | `Silhouette` |
| 21–50 | `branch` | `Silhouette` |
| > 50 | `deep` | `Silhouette` |

**`ast_translate`** *(швидкий шлях, без LLM)*
- Завантажує `PythonAnalyzer` з `drakon-agent/analyzer/ast_analyzer.py` через `importlib.util.spec_from_file_location`
- Повертає список DRAKON IR напряму з AST

**`yaml_gen`** *(LLM-шлях)*
- LLM перетворює код у спрощений YAML-опис поведінки (C4-B формат)
- YAML менш суворий за IR — знижує ризик галюцинацій на першому кроці

**`ir_gen`** *(LLM-шлях)*
- LLM конвертує YAML + оригінальний код у DRAKON IR JSON
- Якщо є `validation_errors` з попередньої ітерації — вони передаються як підказка
- Реалізує **Ralph Loop**: помилки валідації → повторна генерація (до 3 разів)

**`validate`**
- Викликає `validate_ir` з `drakon-agent/validator/ir_validator.py`
- Повертає `validation_errors: list[str]`
- Якщо помилок немає → END; якщо є і ітерацій < 3 → `ir_gen`

### Формат відповіді (Pipeline A)

```json
{
  "job_id": "uuid",
  "status": "done",
  "result": {
    "drakon_ir": [
      {
        "name": "module.function_name",
        "params": "x: int, y: str = ''",
        "items": { "1": {...}, "2": {...} },
        "error": null
      }
    ],
    "tree_level": "primitive",
    "cyclomatic_complexity": 4,
    "validation_errors": []
  }
}
```

Якщо функцій кілька — `drakon_ir` містить список. Кожна функція — окремий DRAKON IR.

### Стан (AnalysisState)

```python
class AnalysisState(TypedDict):
    source_code: str
    file_path: str
    cyclomatic_complexity: int
    tree_level: str          # "primitive" | "silhouette" | "branch" | "deep"
    drakon_type: str         # "Primitive" | "Silhouette"
    behavioral_yaml: str     # проміжний YAML (LLM-шлях)
    drakon_ir: list          # список IR-об'єктів
    validation_errors: list[str]
    iteration_count: int     # лічильник Ralph Loop (max 3)
```

---

## Pipeline B: DRAKON IR → Код

### Призначення
Отримує DRAKON IR однієї функції та цільову мову, генерує код через LLM, перевіряє синтаксис у циклі.

### Граф вузлів

```
code_gen
    │
check_syntax
    │
    ├── valid → END
    └── invalid + iteration < 3 → code_gen (Syntax Loop)
```

### Вузли детально

**`code_gen`**
- LLM отримує DRAKON IR + опис (необов'язково) + цільову мову
- Якщо є `syntax_errors` з попереднього проходу — передаються як контекст
- Генерує код як рядок

**`check_syntax`**
- Python: `ast.parse()` — без зовнішніх залежностей
- TypeScript/JavaScript: повертає `[]` (syntax check поки pass-through, розширювати у майбутньому)
- Повертає `syntax_errors: list[str]` з описом помилок (рядок, повідомлення)

### Формат відповіді (Pipeline B)

```json
{
  "job_id": "uuid",
  "status": "done",
  "result": {
    "code": "def process_data(data: list) -> dict:\n    ...",
    "language": "python",
    "syntax_errors": [],
    "iterations": 1
  }
}
```

### Стан (VibeCodingState)

```python
class VibeCodingState(TypedDict):
    drakon_ir: dict          # один IR-об'єкт {name, params, items}
    description: str         # необов'язковий опис поведінки
    language: str            # "python" | "typescript" | "javascript"
    generated_code: str
    syntax_errors: list[str]
    iteration_count: int     # лічильник Syntax Loop (max 3)
```

---

## Асинхронний job store

Обидва пайплайни використовують in-memory `job_store`:

```python
# pipeline/job_store.py
_store: dict[str, Job] = {}  # очищається при рестарті сервісу
```

**Важливо:** Якщо `architect-agent` рестартується під час виконання:
- `GET /pipeline/status/{id}` повертає HTTP 404
- Клієнт має обробляти 404 як "сервіс недоступний, спробуйте знову"
- Не повторювати 404 у нескінченному циклі

---

## API endpoints (через Worker)

```
POST /v1/pipeline/analyze
  Body: { source_code: string, file_path?: string }
  Returns: { job_id: string }

POST /v1/pipeline/generate
  Body: { drakon_ir: object, language: "python"|"typescript"|"javascript", description?: string }
  Returns: { job_id: string }

GET /v1/pipeline/status/{job_id}
  Returns: {
    job_id: string,
    status: "pending" | "running" | "done" | "error",
    result: AnalyzeResult | GenerateResult | null,
    error: string
  }
```

Усі endpoints потребують `Authorization: Bearer <jwt>`.

---

## Polling pattern (Frontend)

```typescript
// src/lib/pipeline-api.ts
const POLL_INTERVAL = 3000; // 3 секунди

async function waitForJob<T>(job_id: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await pollJob<T>(job_id);
        if (status.status === "done") {
          clearInterval(interval);
          resolve(status.result as T);
        } else if (status.status === "error") {
          clearInterval(interval);
          reject(new Error(status.error));
        }
        // "pending" | "running" → продовжуємо polling
      } catch (err: unknown) {
        // HTTP 404 → сервіс рестартнувся
        if (err instanceof Error && err.message.includes("404")) {
          clearInterval(interval);
          reject(new Error("Сервіс недоступний — спробуйте знову"));
        }
      }
    }, POLL_INTERVAL);
  });
}
```

---

## Розташування файлів

```
services/architect-agent/
├── pipeline/
│   ├── __init__.py
│   ├── states.py          ← AnalysisState, VibeCodingState
│   ├── job_store.py       ← in-memory store
│   ├── nodes_analysis.py  ← вузли Pipeline A
│   ├── nodes_vibe.py      ← вузли Pipeline B
│   └── graphs.py          ← LangGraph графи (analysis_graph, vibe_graph)
├── pipeline_route.py      ← FastAPI router /pipeline/*
└── main.py                ← включає pipeline_router

---

## Семантичні зв'язки

**Цей документ є частиною:** [[architecture/_INDEX]]
**Цей документ пов'язаний з:**
- [[03-architecture]] — загальна архітектура системи AI-DRAKON
- [[05-human-agent-loop]] — людина-в-контурі
- [[01-drakon-ir-spec]] — специфікація DRAKON IR
- [[manual-pipeline-a]] — інструкція з аналізу коду (Pipeline A)
- [[manual-pipeline-b]] — інструкція з генерації коду (Pipeline B)
**Читати далі:** [[05-human-agent-loop]]
```

---
tags:
  - domain:plan
  - status:active
  - format:plan
created: 2026-05-22
updated: 2026-05-28
tier: 3
title: "Pipeline Command Center — Документація сценаріїв"
lang: uk
---

# Pipeline Command Center — Документація сценаріїв

> Документ охоплює всі 7 сценаріїв (`A–G`) платформи AI-DRAKON.  
> Дата: 2026-05-22 · Версія компонента: `PipelineCommandCenter_v3.tsx`

---

## Зміст

1. [Огляд](#1-огляд)
2. [Архітектура компонента](#2-архітектура-компонента)
3. [Загальні концепти](#3-загальні-концепти)
4. [Сценарій A — Код → Генерація](#4-сценарій-a--код--генерація)
5. [Сценарій B — Ідея → Генерація](#5-сценарій-b--ідея--генерація)
6. [Сценарій C — Тест-кейси](#6-сценарій-c--тест-кейси)
7. [Сценарій D — Рефакторинг](#7-сценарій-d--рефакторинг)
8. [Сценарій E — Пояснення коду](#8-сценарій-e--пояснення-коду)
9. [Сценарій F — Специфікація → Код](#9-сценарій-f--специфікація--код)
10. [Сценарій G — Batch аналіз](#10-сценарій-g--batch-аналіз)
11. [API-інтеграції](#11-api-інтеграції)
12. [Стан компонента](#12-стан-компонента)
13. [Спільні панелі](#13-спільні-панелі)

---

## 1. Огляд

Pipeline Command Center — основний робочий інструмент AI-DRAKON платформи, доступний за маршрутом `/pipelines`. Надає 7 AI-підкріплених сценаріїв для роботи з Python-кодом: від аналізу складності до генерації документації.

**Ключовий принцип:** Кожен сценарій — це послідовність кроків (steps), де кожен крок відображає окрему панель в правій зоні. Лівий сайдбар показує список кроків з індикаторами стану (активний / завершений).

**Технології:**
- React 18 + TypeScript
- TanStack Router (`/pipelines` → `PipelinesRoute` → `PipelineCommandCenter`)
- shadcn/ui (Button, Textarea)
- Lucide React (іконки)
- `pipeline-api.ts` — polling-based Job API
- `agent-api.ts` — HTTP до агентів (drakon / architect / docs)

---

## 2. Архітектура компонента

```
/pipelines
└── PipelineCommandCenter
    ├── <aside> Сайдбар (w-48)
    │   ├── Список сценаріїв A–G (вертикальний, активний виділений amber)
    │   ├── <nav> Кроки поточного сценарію (StepIndicator × N)
    │   └── Кнопка "Скинути"
    └── <main> Основна зона
        ├── Хедер (breadcrumb: "Сценарій X · Назва кроку · job: xxxxxxxx…")
        └── Активна панель (змінюється залежно від scenario + currentStep)
```

### StepIndicator

Компонент для відображення одного кроку в сайдбарі. Стани:

| Стан | Вигляд |
|------|--------|
| **done** | Зелений кружок з ✓ |
| **active** | Amber кружок з тінню, стрілка праворуч |
| **pending** | Прозорий кружок, текст приглушений |

Кроки з'єднані пунктирною вертикальною лінією (зелена якщо попередній виконаний).

---

## 3. Загальні концепти

### DRAKON IR

**Intermediate Representation (IR)** — JSON-структура, що описує логічну схему функції. Генерується architect-агентом або Python-парсером (через pipeline-api). Використовується як вхід для генерації коду.

Приклад IR однієї функції:
```json
{
  "name": "calculate_discount",
  "params": ["price", "user_type"],
  "cyclomatic_complexity": 4,
  "items": [
    { "type": "condition", "text": "user_type == 'vip'",
      "yes": [{ "type": "action", "text": "discount = 0.3" }],
      "no":  [{ "type": "action", "text": "discount = 0.1" }]
    },
    { "type": "action", "text": "return price * (1 - discount)" }
  ]
}
```

### Cyclomatic Complexity (CC)

Метрика складності коду (кількість лінійно незалежних шляхів виконання).

| CC | Рівень | Колір |
|----|--------|-------|
| 1–10 | Низький (OK) | Зелений |
| 11–20 | Середній (попередження) | Жовтий |
| > 20 | Критичний | Червоний |

### Job polling

Всі важкі операції (аналіз, генерація) асинхронні. Схема:

```
POST /pipeline/analyze → { job_id }
     ↓ кожні 1.5с
GET /pipeline/job/{job_id} → { status: "pending"|"done"|"error", result? }
```

Таймаут: 60 спроб × 1.5с = 90 секунд.

### extractJson()

Допоміжна функція для парсингу JSON з відповіді агента. Намагається:
1. `JSON.parse(text)` — якщо відповідь чистий JSON
2. Витягти з ````json ... ```` code fence
3. Знайти `{` або `[` і взяти підрядок до `}` або `]`

---

## 4. Сценарій A — Код → Генерація

**Призначення:** Аналіз існуючого Python-коду, перегляд DRAKON IR та регенерація коду.

**Кроки:**

```
[1] Код       → [2] Аналіз    → [3] IR        → [4] Редагування → [5] Генерація → [6] Результат
 PanelCode      PanelAnalyze    PanelIR          PanelEdit          PanelGenerate   PanelResult
```

### Крок 1: Код (PanelCode)

- Textarea для вставки Python-коду
- Поле для шляху до файлу (`path/to/file.py`)
- Кнопка **"Аналізувати"** → запускає `startAnalysis(code, filePath)`

### Крок 2: Аналіз (PanelAnalyze)

- Спінер під час polling
- Після завершення: загальний CC + список функцій з чекбоксами
- Функції можна вибрати/зняти (за замовчуванням всі обрані)
- Кнопка **"Далі"** → перехід до IR

### Крок 3: IR (PanelIR)

- Список обраних функцій з accordion-розкриттям
- JSON IR кожної функції
- Кнопка **"Редагувати"** → передає IR у PanelEdit

### Крок 4: Редагування (PanelEdit)

- Textarea з JSON IR для ручного редагування
- Dropdown вибору мови (python / javascript / typescript / go)
- Кнопка **"Генерувати"** → `startGeneration(ir, language, "")`

### Крок 5: Генерація (PanelGenerate)

- Спінер з підписом "drakon-agent генерує код..."
- Автоматично переходить до Результату після polling

### Крок 6: Результат (PanelResult)

- `<pre>` з згенерованим кодом
- Кнопка копіювання в буфер
- Лічильник ітерацій та попередження про синтаксичні помилки
- Кнопка **"Нова сесія"** → скидає всі стани

---

## 5. Сценарій B — Ідея → Генерація

**Призначення:** Генерація коду з природномовного опису нової функції або модуля.

**Кроки:**

```
[1] Ідея    → [2] IR-gen    → [3] Редагування → [4] Генерація → [5] Результат
 PanelIdea    PanelIRGen      PanelEdit          PanelGenerate   PanelResult
```

### Крок 1: Ідея (PanelIdea)

- Textarea для опису фічі (украно- або англомовний текст)
- Dropdown вибору мови
- Кнопка **"Генерувати IR"** → надсилає до architect-агента

**Промпт до architect-агента:**
```
Generate a DRAKON IR JSON structure for the following feature description:
{idea}
Target language: {language}
Return ONLY valid JSON with 'name' and 'items' fields. No explanation, no markdown, just JSON.
```

### Крок 2: IR (PanelIRGen)

- Спінер з підписом "architect-agent генерує IR..."
- `extractJson()` парсить відповідь
- Якщо парсинг успішний — показує форматований JSON
- При невдачі — показує повідомлення про помилку, сирий текст підставляється в редагування
- Кнопка **"Редагувати"** → перехід до PanelEdit

### Кроки 3–5: спільні з Scenario A

---

## 6. Сценарій C — Тест-кейси

**Призначення:** Автоматична генерація pytest-тестів з DRAKON IR. Кожна умовна гілка в IR = окремий тест-кейс.

**Кроки:**

```
[1] Код       → [2] Аналіз    → [3] Генерація → [4] Тести
 PanelCode      PanelAnalyze    (авто)            PanelTestGen
```

### Крок 1–2: аналогічні Scenario A

Після вибору функцій — кнопка **"Генерувати тести"** (замість "Далі").

### Кроки 3–4: PanelTestGen

Автоматично викликає docs-агента:

**Промпт:**
```
Generate comprehensive pytest test cases for the following functions based on their DRAKON IR structure.

DRAKON IR:
{fns_json}

Requirements:
- Cover every branch and condition path shown in the IR
- Use descriptive test function names
- Include edge cases
- Add docstrings explaining what each test covers
- Return ONLY the Python test code, no explanations
```

**Результат:**
- `<pre>` з pytest-кодом
- Кнопка копіювання

**Чому IR → тести?** DRAKON IR явно описує всі гілки (yes/no умови). Це дозволяє docs-агенту механічно покрити кожен шлях, що неможливо без IR.

---

## 7. Сценарій D — Рефакторинг

**Призначення:** Покращення якості коду з високою цикломатичною складністю. Architect-агент будує план, drakon-агент генерує спрощений код.

**Кроки:**

```
[1] Код       → [2] Аналіз    → [3] План       → [4] Генерація → [5] Результат
 PanelCode      PanelAnalyze    PanelRefactorPlan  PanelGenerate   PanelResult
```

### Крок 3: План рефакторингу (PanelRefactorPlan)

Автоматично викликає architect-агента:

**Промпт:**
```
Analyze the following functions with high cyclomatic complexity and provide a refactoring plan.

Functions:
{fns_json}

Original code:
{code}

Provide:
## Аналіз складності
## Пропозиції рефакторингу
## Кроки реалізації
## Очікуваний результат

Write in Ukrainian. Be specific and actionable.
```

**Відображення:** MarkdownView (парсить `##` заголовки, маркери списків).

Кнопка **"Рефакторити"** → запускає `startGeneration(ir, language, refactorPlan.slice(0, 200))`.

IR для генерації: функції з CC > 10 (якщо всі ≤ 10 — всі обрані).

### Кроки 4–5: спільні з Scenario A

---

## 8. Сценарій E — Пояснення коду

**Призначення:** Генерація людиночитаної документації алгоритму на основі DRAKON IR. Найкорисніший сценарій для онбордингу, code review та роботи з legacy-кодом.

**Кроки:**

```
[1] Код      → [2] Аналіз   → [3] Пояснення (авто) → [4] Документ
 PanelCode     PanelAnalyze   PanelExplain              PanelExplain
```

### Крок 3: Авто-пояснення (PanelExplain)

Крок запускається **автоматично** через `useEffect` при переході:
```typescript
useEffect(() => {
  if (scenario === "E" && currentStep === "explain" && !explanation && !explainLoading) {
    handleExplain();
  }
}, [scenario, currentStep]);
```

**Промпт до docs-агента:**
```
Based on this DRAKON IR structure, provide a clear and detailed explanation of the algorithm in Ukrainian.

DRAKON IR:
{fns_json}

Original source code:
{code}

Structure your response as:
## Огляд алгоритму
## Покрокове виконання
## Ключові умови та гілки
## Складність та особливості
## Можливі покращення

Be thorough but concise. Write in Ukrainian.
```

### Крок 4: Документ

- MarkdownView з розфарбованими заголовками
- Кнопка копіювання всього тексту
- Немає окремого "next" — документ залишається відкритим

**Типовий вихід включає:**
1. Одноречне резюме алгоритму
2. Нумерований список кроків виконання
3. Таблицю або список умов і результатів кожної гілки
4. O-нотацію або словесний опис складності
5. Конкретні пропозиції щодо покращення

---

## 9. Сценарій F — Специфікація → Код

**Призначення:** Генерація коду з формальної або неформальної специфікації. Відрізняється від Scenario B тим, що вхід — структуровані вимоги, а не вільний опис.

**Кроки:**

```
[1] Специфікація → [2] IR         → [3] Редагування → [4] Генерація → [5] Результат
 PanelSpec          PanelIRGen       PanelEdit          PanelGenerate   PanelResult
```

### Крок 1: Специфікація (PanelSpec)

Textarea з placeholder:
```
Вхід: список рядків
Вихід: словник з підрахунком частоти
Обмеження: ігнорувати регістр, пропускати порожні рядки
Очікувана складність: O(n)
```

Dropdown вибору мови.

**Промпт до architect-агента:**
```
Convert the following specification into a DRAKON IR JSON structure.

Specification:
{spec}

Target language: {language}

Return ONLY valid JSON representing the DRAKON IR with 'name', 'items', and 'params' fields.
No explanation, no markdown, just JSON.
```

### Кроки 2–5: аналогічні Scenario B/A

---

## 10. Сценарій G — Batch аналіз

**Призначення:** Швидкий огляд якості всього модуля/файлу. Не генерує код — тільки CC-звіт.

**Кроки:**

```
[1] Модуль   → [2] Звіт (авто)
 PanelCode     PanelBatchResult
```

### Крок 2: Batch звіт (PanelBatchResult)

Відразу після аналізу показує:

**Хедер:**
- Загальна кількість функцій
- Розбивка: `X OK · Y warn · Z crit`
- Рівень дерева (tree_level)

**Таблиця функцій** (сортована за CC від найвищого):

| Функція | CC | Ризик |
|---------|----|-------|
| process_data | `47` (червоний) | критичний |
| validate_user | `15` (жовтий) | середній |
| get_config | `3` (зелений) | низький |

Рядки клікабельні (hover ефект). Відсутня кнопка "Далі" — звіт є кінцевим результатом.

**Коли використовувати:** Перед code review, для пріоритизації рефакторингу, для метрик якості спринту.

---

## 11. API-інтеграції

### pipeline-api.ts

| Функція | Призначення | Повертає |
|---------|-------------|----------|
| `startAnalysis(code, filePath)` | Запускає аналіз коду | `{ job_id }` |
| `startGeneration(ir, language, desc)` | Запускає генерацію | `{ job_id }` |
| `pollJob<T>(job_id)` | Перевіряє статус job | `JobStatus<T>` |

**Типи результатів:**

```typescript
interface AnalyzeResult {
  drakon_ir: AnalyzedFunction[];
  tree_level: string;
  cyclomatic_complexity: number;
}

interface AnalyzedFunction {
  name: string;
  cyclomatic_complexity: number;
  items: unknown[];
  params?: string[];
}

interface GenerateResult {
  code: string;
  language: string;
  syntax_errors: string[];
  iterations: number;
}
```

### agent-api.ts

| Функція | Призначення |
|---------|-------------|
| `sendToAgent(agentId, message)` | Надсилає повідомлення агенту |

```typescript
type AgentId = "drakon" | "architect" | "docs";

interface AgentReply {
  reply: string;
  diagrams?: unknown[];
}
```

**Розподіл агентів по сценаріях:**

| Сценарій | Агент | Роль |
|----------|-------|------|
| A | architect (через pipeline) | Аналіз CC та IR |
| A | drakon (через pipeline) | Генерація коду |
| B | architect (прямий) | IR з ідеї |
| B | drakon (через pipeline) | Генерація коду |
| C | docs (прямий) | pytest-тести |
| D | architect (прямий) | План рефакторингу |
| D | drakon (через pipeline) | Генерований рефакторований код |
| E | docs (прямий) | Пояснення алгоритму |
| F | architect (прямий) | IR зі специфікації |
| F | drakon (через pipeline) | Генерація коду |
| G | architect (через pipeline) | Аналіз CC |

---

## 12. Стан компонента

Всі стани зберігаються локально в `PipelineCommandCenter`. При перемиканні між сценаріями — аналітичні результати скидаються, але `code` і `filePath` зберігаються (зручно для A→C→D→E на одному файлі).

### Загальні стани (shared)

```typescript
// Навігація
scenario: Scenario              // "A" | "B" | "C" | "D" | "E" | "F" | "G"
currentStep: StepId             // ID поточного кроку
doneSteps: Set<StepId>          // Виконані кроки

// Код (A, C, D, E, G)
code: string
filePath: string

// Аналіз
analyzing: boolean
analyzeResult: AnalyzeResult | null
selectedFns: Set<string>

// Генерація
irText: string                  // Редагований IR JSON
language: string                // Цільова мова
generating: boolean
generateResult: GenerateResult | null
jobId: string | null
```

### Специфічні стани (per-scenario)

| Сценарій | Стани |
|----------|-------|
| B | `idea`, `irGenerating`, `irGenText`, `irGenError` |
| C | `testCode`, `testLoading`, `testError` |
| D | `refactorPlan`, `refactorPlanLoading`, `refactorPlanError`, `refactorResult` |
| E | `explanation`, `explainLoading`, `explainError` |
| F | `spec`, `specIrText`, `specIrLoading`, `specIrError` |

---

## 13. Спільні панелі

### PanelCode

Використовується в: A, C, D, E, G (з різними `btnLabel`).

Пропси: `code`, `setCode`, `filePath`, `setFilePath`, `onNext`, `loading`, `btnLabel?`

### PanelAnalyzeBase

Використовується в: A, C, D, E (з різними `onNext` та `btnLabel`).

Однаковий вигляд, різна поведінка кнопки:
- A: "Далі" → PanelIR
- C: "Генерувати тести" → docs-agent
- D: "Скласти план" → architect-agent
- E: "Пояснити" → docs-agent

### PanelEdit

Спільна для A, B, F. Textarea з IR JSON + вибір мови.

### PanelGenerate / PanelResult

Спільні для A, B, D (refactor), F.

### MarkdownView

Легкий inline-рендерер Markdown без залежностей:
- `## Заголовок` → amber bold
- `# Заголовок` → великий bold
- `- item` / `* item` → `• item`
- Порожній рядок → відступ

---

## Швидкий довідник: який сценарій обрати?

| Задача | Сценарій |
|--------|----------|
| Є код, хочу зрозуміти алгоритм | **E — Пояснення** |
| Є код, хочу тести | **C — Тест-кейси** |
| Є складний код, хочу спростити | **D — Рефакторинг** |
| Є ідея нової функції, хочу код | **B — Ідея** |
| Є специфікація/вимоги | **F — Специфікація** |
| Хочу переглянути/змінити IR | **A — Код** |
| Хочу побачити якість всього файлу | **G — Batch аналіз** |

---

## Семантичні зв'язки

**Цей документ є частиною:** [[plans/_INDEX]]
**Цей документ пов'язаний з:**
- [[plans/2026-05-16-pipeline-ui]] — Інтерфейс пайплайну — План реалізації
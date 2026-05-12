# drakon-agent

Локальний FastAPI мікросервіс, що перетворює Python-код на [DRAKON](https://drakon.su/) діаграми.

**URL:** `http://192.168.3.184:8765`  
**Репо:** `services/drakon-agent/` в [ai-drakon-setup](https://github.com/maxfraieho/ai-drakon-setup)

---

## Зміст

1. [Що робить сервіс](#що-робить-сервіс)
2. [Архітектура та пайплайн](#архітектура-та-пайплайн)
3. [DRAKON IR формат](#drakon-ir-формат)
4. [Компоненти](#компоненти)
   - [AST Analyzer](#1-ast-analyzer)
   - [Knowledge Base (BM25)](#2-knowledge-base-bm25)
   - [AI Refiner](#3-ai-refiner)
   - [Validator](#4-validator)
5. [API Endpoints](#api-endpoints)
6. [Налаштування та запуск](#налаштування-та-запуск)
7. [Обмеження та відомі проблеми](#обмеження-та-відомі-проблеми)

---

## Що робить сервіс

Приймає Python-код, аналізує його структуру через вбудований `ast` модуль Python і повертає список
DRAKON IR (Intermediate Representation) — JSON-об'єктів, зрозумілих drakon-editor widget-у.

Кожна функція або метод → окрема DRAKON діаграма.

---

## Архітектура та пайплайн

```
POST /analyze
    │
    ▼
┌───────────────────────────┐
│  1. PythonAnalyzer (AST)  │  Python source → raw DRAKON IR
│     analyzer/             │  (один IR на кожну функцію)
└───────────┬───────────────┘
            │ raw_ir[]
            ▼
┌───────────────────────────┐
│  2. Knowledge Base (BM25) │  Знаходить релевантні DRAKON-правила
│     knowledge_base/       │  за назвою функції + параметрами
└───────────┬───────────────┘
            │ kb_context (текст правил)
            ▼
┌───────────────────────────┐
│  3. AI Refiner            │  LLM рафінує IR: покращує content,
│     ai_refiner/           │  виправляє структуру, людиночитаємі назви
└───────────┬───────────────┘  (якщо refine=false — пропускається)
            │ refined_ir
            ▼
┌───────────────────────────┐
│  4. Validator             │  Перевіряє: наявність b0/end,
│     validator/            │  правильність покажчиків, params-рядок
└───────────┬───────────────┘
            │ ir + _valid + _errors + _warnings
            ▼
        відповідь клієнту
```

**Параметр `refine`:** за замовчуванням `true`. При `false` AI-крок пропускається —
повертається "сирий" IR прямо з AST аналізу. Корисно для відлагодження або коли proxy
недоступний.

---

## DRAKON IR формат

DRAKON IR — це JSON-структура, яку розуміє `drakon-editor` widget.

### Обов'язкові поля верхнього рівня

| Поле | Тип | Опис |
|------|-----|------|
| `name` | string | Назва функції/методу |
| `params` | **string** | Параметри через кому. РЯДОК, не масив! |
| `items` | object | Словник вузлів діаграми |

### Типи вузлів

#### `branch` — точка входу (завжди `b0`)
```json
{
  "type": "branch",
  "branchId": 0,
  "one": "q1"
}
```
**Обов'язково!** Без `b0` widget показує тільки заголовок, flowchart не рендериться.

#### `action` — дія
```json
{
  "type": "action",
  "content": "result = x + y",
  "one": "end"
}
```
`one` — наступний вузол.

#### `question` — умова (if/while/for)
```json
{
  "type": "question",
  "content": "x > 0?",
  "one": "n2",
  "two": "n3"
}
```
`one` = YES-гілка (умова **істинна**), `two` = NO-гілка (умова **хибна**).  
Контент завжди закінчується знаком `?`.

#### `end` — кінцевий вузол (завжди ключ `"end"`)
```json
{
  "type": "end"
}
```

### Повний приклад

```python
def greet(name: str) -> str:
    if not name:
        return "anonymous"
    return "Hello " + name
```

Результат:
```json
{
  "name": "greet",
  "params": "name: str",
  "items": {
    "end": { "type": "end" },
    "b0":  { "type": "branch", "branchId": 0, "one": "q1" },
    "q1":  { "type": "question", "content": "not name?", "one": "n2", "two": "n4" },
    "n2":  { "type": "action", "content": "return \'anonymous\'", "one": "end" },
    "n4":  { "type": "action", "content": "return \'Hello \' + name", "one": "end" }
  }
}
```

---

## Компоненти

### 1. AST Analyzer

**Файли:** `analyzer/cfg_builder.py`, `analyzer/ast_analyzer.py`

#### cfg_builder.py — `DrakonIR`

Акумулятор вузлів IR з правильним форматом widget-у.

| Метод | Призначення |
|-------|-------------|
| `action(content)` | Створює `action`-вузол, повертає `nid` |
| `question(content)` | Створює `question`-вузол з id-префіксом `q` |
| `link_one(from, to)` | Встановлює `items[from]["one"] = to` |
| `link_two(from, to)` | Встановлює `items[from]["two"] = to` |
| `strip_empty()` | Видаляє порожні `action`-вузли, перекидаючи покажчики через них |
| `build(entry, name, params)` | Викликає `strip_empty()`, додає `b0`, повертає IR dict |

`strip_empty()` потрібен тому, що при перекладі `if`-гілок без `else` або циклів
створюються тимчасові "merge" вузли з порожнім `content`. Після з'єднання всіх
покажчиків ці порожні вузли видаляються, щоб не забивати widget зайвими рамками.

#### ast_analyzer.py — `FunctionTranslator`

Обходить `ast.FunctionDef` і транслює кожен оператор у вузли IR.

**Правила трансляції:**

| Python конструкція | DRAKON вузол |
|--------------------|--------------|
| Прості оператори (`=`, `+=`, `expr`, `import`, ...) | `action` (групуються підряд) |
| `if` / `elif` / `else` | `question` + гілки + merge |
| `for` / `while` | `question` (умова циклу) + тіло + зворотній перехід |
| `return` | `action` → потрапляє в `_return_ids` → лінкується до `end` |
| Решта (`try`, `with`, ...) | `action` (fallback, без розгортання) |

**Групування простих операторів:** кілька послідовних `Assign`, `AugAssign`, `Expr` тощо
об'єднуються в один `action`-вузол через `\n`. Це зменшує "шум" — замість 10 окремих
рамок виходить одна читабельна.

**Обробка `return`:** при зустрічі `return` поточна лінія потоку завершується (немає
наступника). Всі `return`-вузли накопичуються в `_return_ids` і після обходу всього тіла
функції одним разом лінкуються до `"end"`.

**Клас `PythonAnalyzer`:** точка входу. Викликає `ast.walk()` двічі — спочатку для методів
класів (щоб зберегти назву `ClassName.method`), потім для top-level функцій, уникаючи
повторень.

---

### 2. Knowledge Base (BM25)

**Файли:** `knowledge_base/ingest.py`, `knowledge_base/retrieval.py`  
**Дані:** `knowledge/*.md`

#### Як влаштована

1. `ingest.py` читає всі `.md`-файли з папки `knowledge/`.
2. Кожен файл розбивається на секції по `## Heading`.
3. Текст кожної секції токенізується regex `[a-zA-Z0-9_]+` → список слів.
4. З усіх документів будується `BM25Okapi` індекс (rank-bm25).

#### Пошук

`retrieve(query, top_k=3)` — повертає `top_k` найрелевантніших секцій для запиту.  
`retrieve_text(query)` — те саме, але конкатенований текст для вставки в LLM-промт.

Запит формується з назви функції + параметрів:  
`"greet name: str"` → знаходить секцію про `action` вузли та `params as string`.

#### Додавання нових правил

Достатньо створити новий `.md`-файл у `knowledge/` і перезапустити сервіс.
Індекс будується при першому запиті (`_ensure_kb()` lazy init).

---

### 3. AI Refiner

**Файли:** `ai_refiner/prompts.py`, `ai_refiner/refiner.py`

#### Призначення

AST-переклад дає синтаксично правильний IR, але з "сирими" рядками Python (`return \'anonymous\'`,
`not name?`, `x = x + 1`). AI refiner:
- Робить контент людиночитаємим
- Виправляє структуру, якщо AST щось пропустив
- Гарантує закінчення `?` у `question`-вузлах
- Прибирає зайві порожні вузли, які `strip_empty` не вловив

#### Промт

`SYSTEM_PROMPT` — системний промт з повним переліком DRAKON IR правил.  
`build_refine_prompt(raw_ir, kb_context)` — будує user-повідомлення:
- вставляє `kb_context` (релевантні правила з BM25)
- вставляє `raw_ir` як JSON

Модель повертає **тільки JSON** (без markdown, без пояснень).

#### Proxy

Запит іде на `PROXY_URL/chat/completions` (OpenAI-сумісний API).  
За замовчуванням: `http://localhost:18880/v1`, модель `coding-proxy`, токен `freecc`.

`refine_ir_safe()` — graceful degradation: якщо LLM недоступний або повертає
не-JSON, повертається `raw_ir` з полем `_refine_error`.

---

### 4. Validator

**Файл:** `validator/ir_validator.py`

Перевіряє структурну коректність IR перед поверненням клієнту.

#### Що перевіряється

| Перевірка | Рівень |
|-----------|--------|
| Наявність `b0` з `type:"branch"`, `branchId`, `one` | error |
| Наявність `end` з `type:"end"` | error |
| `params` — рядок, не масив | error |
| `question` має `one` і `two`, обидва існують в `items` | error |
| `action` — `one` посилається на існуючий вузол | error |
| `question.content` закінчується `?` | warning |
| Досяжність усіх вузлів з `b0` | warning |

Результат додається до IR у полях `_valid`, `_errors`, `_warnings`.

---

## API Endpoints

### `GET /health`

```bash
curl http://localhost:8765/health
# {"status":"ok","service":"drakon-agent"}
```

---

### `POST /analyze`

Основний endpoint. Повний пайплайн або без AI-рафінування.

**Тіло запиту:**

| Поле | Тип | За замовчуванням | Опис |
|------|-----|-----------------|------|
| `code` | string | — | Python-код для аналізу |
| `filename` | string | `"module.py"` | Ім'я файлу (для помилок) |
| `refine` | bool | `true` | `false` → пропустити AI refiner |

**Приклад:**

```bash
curl -X POST http://localhost:8765/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "def add(a, b):\n  return a + b", "refine": false}'
```

**Відповідь:**

```json
{
  "filename": "module.py",
  "diagrams": [
    {
      "name": "add",
      "params": "a, b",
      "items": {
        "end": {"type": "end"},
        "b0":  {"type": "branch", "branchId": 0, "one": "n1"},
        "n1":  {"type": "action", "content": "return a + b", "one": "end"}
      },
      "_valid": true
    }
  ],
  "count": 1
}
```

**Поля `_valid`, `_errors`, `_warnings`** — завжди присутні. Якщо IR невалідний,
в `_errors` список проблем.

---

### `POST /feedback`

Прийом зворотного зв'язку для майбутнього покращення.

```bash
curl -X POST http://localhost:8765/feedback \
  -H "Content-Type: application/json" \
  -d '{"diagram_name": "greet", "feedback": "merge node is redundant"}'
```

**TODO:** збереження в knowledge base для оновлення BM25.

---

## Налаштування та запуск

### Перші кроки

```bash
cd ~/workspace/ai-drakon-setup/services/drakon-agent

# Скопіювати .env
cp .env.example .env

# Відредагувати .env (якщо proxy на іншому порті)
# nano .env

# Запустити
.venv/bin/python3 main.py
```

### .env змінні

| Змінна | За замовчуванням | Опис |
|--------|-----------------|------|
| `PROXY_URL` | `http://localhost:18880/v1` | OpenAI-сумісний proxy endpoint |
| `PROXY_TOKEN` | `freecc` | Bearer токен для proxy |
| `PROXY_MODEL` | `coding-proxy` | Назва моделі (slot) |

### venv — важливо

На сервері `192.168.3.184` встановлено **AMD C-60** (2011, без AVX-інструкцій).
PyPI-збірки numpy 2.x скомпільовані з AVX і падають з `Illegal instruction`.

**Рішення:** venv створений з `--system-site-packages`:
```bash
python3 -m venv .venv --system-site-packages
```
Це дозволяє використовувати системний numpy (Alpine Linux будує без AVX).

Якщо venv пошкоджено — відновлення:
```bash
rm -rf .venv
python3 -m venv .venv --system-site-packages
.venv/bin/pip install rank-bm25 fastapi uvicorn pydantic python-dotenv httpx
```

### Структура файлів

```
services/drakon-agent/
├── main.py                     # FastAPI app, підключає роутери
├── schemas.py                  # Pydantic моделі (базові)
├── pyproject.toml              # Залежності проекту
├── .env.example                # Шаблон змінних середовища
├── .gitignore
│
├── analyzer/
│   ├── cfg_builder.py          # DrakonIR акумулятор (IDGen + nodes)
│   └── ast_analyzer.py         # PythonAnalyzer + FunctionTranslator
│
├── knowledge/
│   └── drakon-ir-format.md     # Правила DRAKON IR для BM25
│
├── knowledge_base/
│   ├── ingest.py               # Читає .md → BM25Okapi індекс
│   └── retrieval.py            # retrieve(query) → list[dict]
│
├── ai_refiner/
│   ├── prompts.py              # SYSTEM_PROMPT + build_refine_prompt()
│   └── refiner.py              # refine_ir() + refine_ir_safe()
│
├── validator/
│   └── ir_validator.py         # validate_ir() → ValidationResult
│
└── routes/
    ├── health.py               # GET /health
    ├── analyze.py              # POST /analyze  (головний пайплайн)
    └── feedback.py             # POST /feedback
```

---

## Обмеження та відомі проблеми

| Проблема | Статус |
|---------|--------|
| `try/except` не розгортається в DRAKON-вузли (fallback → action) | TODO |
| `break`/`continue` всередині циклів ігноруються | TODO |
| Вкладені функції (`def` всередині `def`) не обробляються | TODO |
| `POST /feedback` не зберігає дані (тільки підтверджує отримання) | TODO |
| AI refiner потребує запущеного proxy на :18880 | workaround: `refine=false` |
| `params` для `*args`, `**kwargs` може виглядати незвично | cosmetic |

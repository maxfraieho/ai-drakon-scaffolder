---
tags:
  - domain:kb
  - status:canonical
  - format:spec
created: 2026-05-26
updated: 2026-05-28
tier: 1
title: "DRAKON IR — База знань для агента"
lang: uk
---

# DRAKON IR — Повна база знань для агента (формалізована)

## Призначення
Цей файл є єдиним джерелом правил для AI-рафінування DRAKON IR.
Замінює всі попередні файли 01-08. Структурований для BM25-пошуку.
Кожна секція — окремий документ в індексі.

---

## Базова структура IR

Кожна DRAKON-схема — це JSON з трьома обов'язковими полями:
- `name` (string) — назва функції або алгоритму
- `params` (string) — параметри як РЯДОК, ніколи не масив
- `items` (object) — словник вузлів схеми

Обов'язкові вузли в `items`:
- `b0` — точка входу (branch, branchId:0, one → перший вузол)
- `end` — єдина точка виходу (type:"end")

Без b0 widget показує тільки заголовок, без end — схема не завершена.

---

## Типи вузлів і їх поля

### branch (точка входу)
```json
{"type":"branch","branchId":0,"one":"<перший_вузол>"}
```
Завжди має ключ `b0`. branchId=0 для головного входу.
Вказівник `one` → перший вузол алгоритму.

### action (дія)
```json
{"type":"action","content":"Людиночитаємий опис дії","one":"<наступний>"}
```
Для простих операцій: присвоєння, виклики функцій, print, pass.
Кілька послідовних простих операцій → ОДИН action через `\n`.
content НІКОЛИ не містить сирий Python (не `x = x + 1`, а `Збільшити x на 1`).

### question (умова/рішення)
```json
{"type":"question","content":"Умова виконана?","one":"<так>","two":"<ні>"}
```
`one` = ТАК (умова істинна) → вниз по головному шляху (skewer).
`two` = НІ (умова хибна) → вправо по альтернативному шляху.
content ЗАВЖДИ закінчується знаком `?`.

### end (кінець)
```json
{"type":"end"}
```
Ключ завжди `"end"`. Єдиний кінцевий вузол. Всі return/raise → сюди.

---

## Правило: single terminal constraint

ЗАБОРОНЕНО мати кілька вузлів end або кілька шляхів виходу.
Кожен return, raise, sys.exit → action вузол → `one` → `"end"`.

НЕПРАВИЛЬНО:
```
n1 → end
n2 → end  ← дублює end
```

ПРАВИЛЬНО:
```
n1 (action: return result) → "end"
n2 (action: return None)   → "end"
```

---

## Правило: vector constraints (напрямки стрілок)

`one` завжди вказує ВНИЗ (головний шлях, happy path, skewer).
`two` завжди вказує ВПРАВО (альтернатива, помилка, else).

ЗАБОРОНЕНО: `two` вказує вліво або вгору.
ЗАБОРОНЕНО: `one` у question вказує на один і той же вузол що і `two`.

---

## Відображення if/elif/else → question

Python `if`:
```python
if умова:
    дія_так
else:
    дія_ні
```

DRAKON IR:
```
q1 (question: "Умова виконана?") → one: n1, two: n2
n1 (action: дія_так)             → one: merge
n2 (action: дія_ні)              → one: merge
merge (action: "")               → one: <далі>
```

Python `if/elif/else`:
```
q1 → one: n1, two: q2
q2 → one: n2, two: n3
n1, n2, n3 → все до merge
```
Кожен `elif` → новий question праворуч (two від попереднього).

---

## Відображення циклів → question

Python `for item in collection`:
```
q1 (question: "Є ще елементи в collection?")
   one: body_first  ← крок ітерації
   two: exit_node   ← вихід з циклу
body_last → one: q1  ← зворотній зв'язок
```

Python `while умова`:
```
q1 (question: "Умова циклу виконана?")
   one: body_first
   two: exit_node
body_last → one: q1
```

break всередині циклу → action → `one` → вузол ПІСЛЯ циклу (мине q1).
continue всередині циклу → action → `one` → q1 (умова циклу).

---

## Відображення try/except/finally → question

Python `try/except/finally`:
```python
try:
    ризикова_операція()
except Помилка as e:
    обробка_помилки(e)
finally:
    очищення()
```

DRAKON IR:
```
n1 (action: Виконати ризикову операцію)
q1 (question: "Виникла помилка Помилка?")
   one: n3    ← НІ (happy path) → вниз
   two: n2    ← ТАК (exception) → вправо
n2 (action: Обробити помилку e) → one: n4
n3 (action: "")                 → one: n4
n4 (action: Очищення [finally]) → one: end
```

Без `finally` — n2 і n3 зустрічаються в merge вузлі.

---

## Правило: людиночитаємі назви іконок

Зміни сирий Python на зрозумілі описи:

| Сирий Python | Людиночитаємо |
|---|---|
| `if not name:` | "Ім'я не вказано?" |
| `return 'anon'` | "Повернути 'anonymous'" |
| `x = x + 1` | "Збільшити лічильник на 1" |
| `items.append(item)` | "Додати елемент до списку" |
| `db.commit()` | "Зберегти зміни в базу даних" |
| `resp.raise_for_status()` | "Перевірити HTTP відповідь" |
| `json.loads(content)` | "Розпарсити JSON-відповідь" |

Правила:
- Дієслово на початку (Перевірити, Завантажити, Зберегти, Повернути)
- Без технічних деталей реалізації
- З урахуванням контексту проекту (якщо відомо)
- Максимум 50 символів на іконку

---

## Правило: params як рядок

ПРАВИЛЬНО: `"params": "name: str, x: int"`
НЕПРАВИЛЬНО: `"params": ["name", "x"]`
НЕПРАВИЛЬНО: `"params": {"name": "str"}`

Якщо функція без параметрів: `"params": ""`
Якщо `*args, **kwargs`: `"params": "*args, **kwargs"`

---

## Правило: порожні вузли

strip_empty видаляє action з порожнім content і перекидає вказівники.
НЕ створювати вузли з `"content": ""` якщо вони не є merge-точками.
Merge вузол (з'єднання гілок) МОЖЕ мати порожній content.

---

## Відображення класів

Метод класу `ClassName.method_name`:
- `name`: `"ClassName.method_name"` (крапкова нотація)
- Клас НЕ є окремим вузлом
- `params` не містить `self`

---

## Відображення вкладених функцій

`def inner()` всередині `def outer()` → окрема схема:
- `outer` → схема з action "Виклик inner()" → `one`: insertion вузол
- `inner` → своя схема
- Вкладені функції не розгортаються в тіло outer

---

## Метрики якості схеми

**SIS (Skewer Integrity Score)** = вузли на головному шляху / всі вузли
- SIS > 0.40 — хороша схема
- SIS < 0.20 — надто фрагментована, потребує рефакторингу

**RDC (Rightward Degradation Count)** = глибина ланцюга `two` вказівників
- RDC < 4 — норма
- RDC ≥ 4 — занадто глибоко, треба виносити в окрему схему

**Cyclomatic Complexity V(G)**:
- V(G) ≤ 2: тривіальна — не потребує схеми
- 3 ≤ V(G) ≤ 10: стандартна Primitive схема
- V(G) > 10: потрібна Silhouette декомпозиція

---

## Приклад повної схеми

```python
def greet(name: str) -> str:
    if not name:
        return "anonymous"
    return "Hello " + name
```

```json
{
  "name": "greet",
  "params": "name: str",
  "items": {
    "end": {"type": "end"},
    "b0":  {"type": "branch", "branchId": 0, "one": "q1"},
    "q1":  {"type": "question", "content": "Ім'я не вказано?", "one": "n2", "two": "n4"},
    "n2":  {"type": "action", "content": "Повернути 'anonymous'", "one": "end"},
    "n4":  {"type": "action", "content": "Повернути 'Hello ' + name", "one": "end"}
  }
}
```

---

## Типові помилки і виправлення

| Помилка | Виправлення |
|---|---|
| question без `two` | Додати `two` → merge або exit вузол |
| action без `one` | Якщо кінець → `one: "end"` |
| `params` як масив | Перетворити в рядок через `, `.join |
| Відсутній `b0` | Додати `"b0": {"type":"branch","branchId":0,"one":"<перший>"}` |
| Два `end` вузли | Об'єднати в один, всі посилання → `"end"` |
| `content` сирий Python | Переписати на людиночитаємо |
| question content без `?` | Додати `?` в кінець |
| `one` вказує на неіснуючий id | Виправити id або створити вузол |

---

## Семантичні зв'язки
**Цей документ є частиною:** [[kb/_INDEX]]

**Цей документ пов'язаний з:**
- [[kb/02-agent-prompts]] — наступний розділ (02 agent prompts)
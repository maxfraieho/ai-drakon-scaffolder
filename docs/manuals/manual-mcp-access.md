---
tags:
  - domain:manual
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "Мануал: MCP-доступ для розробників та агентів"
lang: uk
---

# Мануал: MCP-доступ для розробників та агентів

## 1. Протокол MCP та авторизація

Платформа **AI-DRAKON** надає розробникам та зовнішнім інтелектуальним агентам можливість повного програмного керування всіма своїми ресурсами через протокол **MCP (Model Context Protocol)**. Сервіс працює поверх HTTP/SSE і розгорнутий за адресою:
* **MCP Endpoint**: `https://drakon-mcp-worker.maxfraieho.workers.dev/mcp`
* **Health Check**: `https://drakon-mcp-worker.maxfraieho.workers.dev/health`

### Параметри авторизації:
Кожен запит до MCP повинен супроводжуватися заголовком Bearer авторизації:
* **Header**: `Authorization: Bearer drakon-mcp-2026`

> [!IMPORTANT]
> **УВАГА (Блокування Cloudflare WAF):**
> Для захисту від автоматичного спаму Cloudflare WAF блокує стандартні запити з бібліотек на кшталт `urllib` у Python (повертає HTTP 403 Forbidden). 
> При реалізації власних скриптів інтеграції **обов'язково додавайте реалістичний заголовок `User-Agent`**, наприклад:
> `"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."`

---

## 2. Групи та перелік MCP-інструментів

Наразі екосистема підтримує повний набір інструментів, розбитих на 4 функціональні групи:

### 📂 Група 1: `docs.*` (Робота з базою знань та документацією)
Ці інструменти дозволяють взаємодіяти із базою знань проекту (Knowledge Base), виконувати пошук документів за допомогою мови DQL (Dataview Query Language) та аналізувати зв'язки.

* **`docs.query`** — Виконання DQL-запиту до бази знань.
  * *Аргументи*: `query` (рядок запиту).
* **`docs.read`** — Читання повного тексту документа за його шляхом.
  * *Аргументи*: `path` (відносний шлях до файлу).
* **`docs.wikilink`** — Знаходження документа за його заголовком (розкриття вікілінків).
  * *Аргументи*: `title` (назва).
* **`docs.backlinks`** — Отримання списку документів, які посилаються на вказаний файл.
  * *Аргументи*: `path` (шлях).

#### Приклад запиту:
```bash
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer drakon-mcp-2026" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "docs.query",
      "arguments": {
        "query": "LIST FROM \"docs\" LIMIT 3"
      }
    }
  }'
```

---

### ⚙️ Група 2: `pipeline.*` (Керування інженерними конвеєрами)
Ці інструменти забезпечують виконання асинхронних процесів трансляції між кодом та візуальними схемами.

* **`pipeline.analyze`** — Запуск Pipeline A (Аналіз коду та генерація DRAKON IR).
  * *Аргументи*: `code` (код), `language` (мова), `file_path` (ім'я файлу).
* **`pipeline.status`** — Опитування статусу запущеної асинхронної задачі аналізу.
  * *Аргументи*: `job_id` (ідентифікатор задачі).
* **`pipeline.generate`** — Запуск Pipeline B (Генерація коду з DRAKON IR JSON).
  * *Аргументи*: `ir` (об'єкт IR JSON), `target_language` (цільова мова).

#### Приклад запиту:
```bash
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer drakon-mcp-2026" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "pipeline.generate",
      "arguments": {
        "target_language": "python",
        "ir": {
          "type": "drakon-ir",
          "version": "1.0",
          "nodes": [{"id":"b0", "type":"start", "title":"START"}],
          "edges": []
        }
      }
    }
  }'
```

---

### 📊 Група 3: `diagram.*` (CRUD операції зі схемами)
Повний набір інструментів для збереження, завантаження та модифікації ДРАКОН-схем безпосередньо у сховищі проекту.

* **`diagram.list`** — Отримання списку всіх наявних схем.
* **`diagram.create`** — Створення нової візуальної схеми.
* **`diagram.read`** — Читання структури та IR-коду конкретної схеми.
* **`diagram.update`** — Оновлення геометрії та логіки схеми.
* **`diagram.delete`** — Видалення схеми.

---

### 🤖 Група 4: `agent.*` (Діалог з інтелектуальними агентами)
Інструменти для прямої взаємодії з ШІ-агентами платформи.

* **`agent.chat`** — Надсилання текстового повідомлення та контексту конкретному агенту.
  * *Аргументи*: `agent` (назва агента: `architect`, `docs`, `drakon`), `message` (повідомлення), `context` (об'єкт додаткового контексту).

#### Приклад запиту:
```bash
curl -s -X POST https://drakon-mcp-worker.maxfraieho.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer drakon-mcp-2026" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "agent.chat",
      "arguments": {
        "agent": "architect",
        "message": "Розкажи про переваги ДРАКОН перед Flowchart"
      }
    }
  }'

---

## Семантичні зв'язки

**Цей документ є частиною:** [[manuals/_INDEX]]
**Цей документ пов'язаний з:**
- [[08-agent-docs-integration]] — повна інтеграція docs-agent та DQL
- [[manual-agent-studio]] — посібник користувача з Agent Studio
- [[02-agent-prompts]] — промпти та навички для ШІ-агентів
```

---
tags:
  - domain:concept
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 2
title: "07 — Робочий процес розробки агентів"
lang: uk
---

# 07 — Робочий процес розробки агентів

> Реальний патерн використання для розробки AI-DRAKON за допомогою Claude Code, goclaw та Codex.

## Огляд

Три агенти взаємодіють у багаторівневому робочому процесі:

```
Claude Code (архітектор + ревьюер)
    ↓ делегує імплементацію
goclaw (кодуючий агент на 192.168.3.184)
    ↓ використовує free-claude-code проксі
NIM моделі (безкоштовний інференс на NVIDIA GPU)
    ↑ Codex (паралельні батч-задачі)
```

## Налаштування goclaw

**Конфігурація:** `/home/vokov/projects/goclaw/config.json`

```json
{
  "providers": {
    "openai": {
      "api_key": "freecc",
      "api_base": "http://localhost:18880/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "coding-proxy"
    }
  }
}
```

**Оточення (Env):** `/home/vokov/projects/goclaw/.env.local`
```
GOCLAW_OPENAI_API_KEY=freecc
GOCLAW_OPENAI_BASE_URL=http://localhost:18880/v1
```

**Доступні слоти** (параметр `model=` у goclaw):
- `coding-proxy` — генерація коду (за замовчуванням)
- `fast-proxy` — швидкі задачі (аліас: claude-haiku-3-5)
- `standard-proxy` — збалансований (аліас: claude-sonnet-4-5)
- `reasoning-proxy` — складний аналіз
- `analytics-proxy` — аналіз даних

## Інтеграція MCP

**Конфігурація MCP:** `.mcp.json` у корені репозиторію (Streamable HTTP)

```json
{
  "mcpServers": {
    "drakon": {
      "type": "streamable-http",
      "url": "https://drakon-mcp-worker.maxfraieho.workers.dev/mcp",
      "headers": { "Authorization": "Bearer drakon-mcp-2026" }
    }
  }
}
```

**Доступні інструменти MCP (MCP tools):**
- `drakon.analyzecodebase(owner, repo, branch)` → DRAKON IR для всіх функцій
- `drakon.savediagram(name, ir)` → зберегти в MinIO (потребує MINIO_SECRET_KEY)
- `drakon.listdiagrams()` → показати список збережених діаграм
- `drakon.validateir(ir)` → перевірити структуру IR
- `drakon.getdiagram(name)` → завантажити збережену діаграму

## Типовий цикл розробки

### 1. Аналіз існуючого коду → DRAKON IR

```
Claude Code викликає: drakon.analyzecodebase(owner="maxfraieho", repo="free-claude-code-alpine")
→ Повертає 83 діаграми DRAKON (функції Python)
→ Claude переглядає ключові діаграми (SlotRouter, HealthRegistry тощо)
→ Визначає зони для покращення
```

### 2. Планування з Claude, реалізація з goclaw

```
Claude Code: пише план реалізації (docs/plans/YYYY-MM-DD-feature.md)
Claude Code: делегує завдання до goclaw через Telegram або прямий API
goclaw: реалізує код за допомогою слоту coding-proxy
Claude Code: перевіряє та валідує імплементацію
```

### 3. Пакетні зміни файлів (batching) за допомогою Codex

Коли спрацьовують тригери T1-T5 (N≥3 подібних файлів, N≥2 нових файлів):
```bash
codex exec --dangerously-bypass-approvals-and-sandbox "<task prompt>"
```

### 4. Валідація через DRAKON

```
Після реалізації:
drakon.analyzecodebase → перевірка, чи нові функції мають коректний IR
drakon.validateir → валідація створених вручну IR
drakon.savediagram → збереження затверджених діаграм у MinIO
```

## Мікросервіс Python AST

**Кінцева точка (Endpoint):** `https://research.exodus.pp.ua`

```bash
# Health check (перевірка стану)
curl https://research.exodus.pp.ua/health

# Аналіз одного файлу
curl -X POST https://research.exodus.pp.ua/analyze \
  -H "Content-Type: application/json" \
  -d '{"source": "def foo(x):\n  if x: return 1\n  return 0", "filename": "foo.py"}'

# Аналіз кількох файлів
curl -X POST https://research.exodus.pp.ua/analyze-files \
  -H "Content-Type: application/json" \
  -d '{"files": [{"path": "module.py", "source": "..."}]}'
```

**Формат DRAKON IR, що повертається:**
```json
{
  "name": "ClassName.method_name",
  "items": {
    "1": {"type": "terminator", "text": "START", "next": "2"},
    "2": {"type": "decision", "text": "condition?", "yes": "3", "no": "4"},
    "3": {"type": "action", "text": "do_thing()", "next": "5"},
    "4": {"type": "action", "text": "other()", "next": "5"},
    "5": {"type": "terminator", "text": "END", "next": null}
  },
  "complexity": 2
}
```

**Типи вузлів:** `terminator`, `action`, `decision`, `loop_start`, `loop_end`, `call`, `branch`

**Правила маппінгу DRAKON (на основі досліджень Gemini):**
| Конструкція Python | Вузол DRAKON | Правило |
|-------------------|--------------|---------|
| `if/elif/else` | `decision` chain | Common Fate Merge (Злиття спільної долі) |
| `for/while` | `loop_start` + `loop_end` | Умова виходу на `loop_end` |
| `break` | `action` → jump past `loop_end` | Синтетичне ребро переходу |
| `try/except` | `action` + synthetic `decision` | Виняток = правостороннє відхилення (Rightward Degradation) |
| `finally` | convergence `action` | Дія сходження (обидва шляхи зустрічаються) |
| `with` | collapsed `action` | Контекстний менеджер як атомарна дія |
| Послідовні присвоєння | один `action` | Basic Block grouping (Групування базових блоків) |

## Спостерігач БПЛА (UAV Watcher — окремий проект)

**Репозиторій:** `github.com/maxfraieho/uav-watcher` (приватний)
**Сервер:** 192.168.3.184, директорія `/home/vokov/projects/uav-watcher/`
**Логи:** `tail -f /var/log/uav-watcher.log` (OpenRC: uav-watcher)

Моніторить Telegram-канал `-1002187970584` на наявність загроз БПЛА для м. Олександрія.
Конвеєр (Pipeline): Telethon userbot (@jdepardieu) → regex пре-фільтр → goclaw AI (слот fast-proxy) → Bot API → Q.

Додавання каналів: відредагуйте `config.json` → `rc-service uav-watcher restart`.

---

## Семантичні зв'язки
**Цей документ є частиною:** [[concept/_INDEX]]
**Цей документ пов'язаний з:**
- [[05-human-agent-loop]] — взаємодія людини та агента
- [[06-knowledge-base]] — інтегрована база знань

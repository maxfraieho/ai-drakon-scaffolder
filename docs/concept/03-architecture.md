---
tags:
  - domain:architecture
  - status:active
  - format:guide
created: 2026-05-26
updated: 2026-05-28
tier: 1
title: "03 — Архітектура системи"
lang: uk
---

# 03 — Архітектура системи

## Огляд

AI-DRAKON складається з трьох шарів: **клієнт** (браузер), **проксі** (Cloudflare Worker), **агенти** (Python FastAPI на власному сервері).

```
Браузер (Lovable/React)
    │ HTTPS + JWT
    ▼
Cloudflare Worker  ←── MCP-клієнти (Claude Code, goclaw)
    │ auth + proxy
    ├── /v1/pipeline/analyze  ──►  architect-agent:8766
    ├── /v1/pipeline/generate ──►  architect-agent:8766
    ├── /v1/pipeline/status   ──►  architect-agent:8766
    ├── /mcp/drakon.*         ──►  drakon-agent:8765
    └── /api/docs/*           ──►  docs-agent:8767
    
192.168.3.184 (сервер)
    ├── drakon-agent  :8765  (Python AST → DRAKON IR)
    ├── architect-agent :8766  (LangGraph пайплайни)
    └── docs-agent    :8767  (документація коду)
```

---

## Три агенти та їхні ролі

### drakon-agent (порт 8765)
**Роль:** Детерміністичний транслятор Python AST → DRAKON IR.

Використовує `ast.NodeVisitor` без LLM. Гарантує відтворюваний результат для одного й того самого коду. Це **виконавчий модуль** — не думає, транслює.

Точки входу:
- `POST /analyze` — один рядок коду, повертає список IR
- `POST /analyze-files` — кілька файлів одразу
- `POST /validate` — валідація готового IR

### architect-agent (порт 8766)
**Роль:** Орхестратор LangGraph-пайплайнів. Приймає завдання (аналіз коду, генерація коду), запускає граф вузлів, повертає job_id для асинхронного опитування.

Відповідає за:
- вибір стратегії (AST-транслятор vs LLM-шлях) на основі CC
- Ralph Loop — цикл валідації IR (до 3 ітерацій)
- Syntax Loop — цикл перевірки синтаксису згенерованого коду

### docs-agent (порт 8767)
**Роль:** Генерація технічної документації кодової бази. Використовує Davia або інші LLM-шаблони для трансформації коду в структуровані документи.

---

## Cloudflare Worker

Worker — єдина точка входу для клієнтів. Виконує:

1. **JWT-автентифікацію** — кожен запит валідує Bearer-токен
2. **Проксування** до агентів через Cloudflare Tunnel (cloudflared)
3. **MCP-сервер** — надає інструменти Claude Code та іншим MCP-клієнтам
4. **Timeout** — 120 секунд на запит (достатньо для LangGraph-граф із 3 ітераціями)

```javascript
// worker-mcp-drakon.js — маршрути пайплайну
POST /v1/pipeline/analyze  → architect-agent:8766/pipeline/analyze
POST /v1/pipeline/generate → architect-agent:8766/pipeline/generate
GET  /v1/pipeline/status/:jobId → architect-agent:8766/pipeline/status/:jobId
```

---

## Lovable Frontend

React/Vite/TypeScript застосунок, що будується Lovable і деплоїться на Cloudflare Pages.

Ключові маршрути:
- `/diagrams` — редактор DRAKON-діаграм (DiagramsPage)
- `/docs` — документація коду (notes, graph, generator tabs)
- `/chat` — чат з агентами

Стек компонентів:
- **DrakonWidget** — зовнішня бібліотека рендерингу DRAKON (не модифікувати)
- **DiagramsPage** — основна сторінка: список діаграм, редактор, github-панель
- **CodeAnalysisPanel** — правий слайд-ін для Pipeline A *(в розробці)*
- **CodeGenerationPanel** — нижній drawer для Pipeline B *(в розробці)*
- **NotesTab** — навігація по нотатках з деревом файлів та пошуком

---

## Потік автентифікації

```
1. Користувач логіниться → Worker видає JWT (підписаний JWT_SECRET)
2. Frontend зберігає JWT у localStorage
3. Кожен запит: Authorization: Bearer <jwt>
4. Worker перевіряє підпис → проксує до агента
5. Агент не знає про JWT (довіряє Worker)
```

---

## Інфраструктура

| Сервіс | Хост | Порт | URL | Статус |
|--------|------|------|-----|--------|
| Cloudflare Worker | CF Edge | — | drakon-mcp-worker.maxfraieho.workers.dev | ✅ |
| Cloudflare Pages | CF Edge | — | ai-drakon-setup.pages.dev | ✅ |
| drakon-agent | 192.168.3.184 | 8765 | через tunnel | ✅ |
| architect-agent | 192.168.3.184 | 8766 | через tunnel | ✅ |
| docs-agent | 192.168.3.184 | 8767 | через tunnel | ✅ |
| LLM Proxy (goclaw) | 192.168.3.184 | 18880 | openai-proxy.exodus.pp.ua | ✅ |
| cloudflared tunnel | 192.168.3.184 | — | keep-soyka.pp.ua | ✅ |

**Управління сервісами на сервері:** OpenRC (не systemd)
```bash
sudo rc-service ai-drakon-agent restart
sudo rc-service ai-architect-agent restart
sudo rc-service ai-docs-agent restart
```

---

## Репозиторії

| Репозиторій | Призначення |
|------------|-------------|
| `maxfraieho/ai-drakon-setup` (origin) | Публічний: документація, сервіси, worker |
| `maxfraieho/drakon-flow` (drakon-flow) | Приватний: Lovable manages (React/TS frontend) |

**Правило синхронізації:** після кожної зміни в Worker або сервісах — scp на сервер + `git push origin && git push drakon-flow`.

---

## Семантичні зв'язки

**Цей документ є частиною:** [[architecture/_INDEX]]
**Цей документ пов'язаний з:**
- [[01-vision]] — концепція AI-DRAKON
- [[02-drakon-primer]] — вступ до мови ДРАКОН
- [[04-pipelines]] — детальний опис пайплайнів

# API Endpoints — Всі агенти

## drakon-agent (порт 8765, https://drakon-agent.exodus.pp.ua)

| Метод | Шлях | Опис |
|-------|------|------|
| GET | /health | Статус агента |
| POST | /analyze | Аналіз Python-коду → DRAKON IR |
| POST | /chat | Діалог, питання про можливості |
| POST | /analyze_folder | Аналіз всіх .py файлів у папці |
| POST | /feedback | Зворотний зв'язок по схемі |

### POST /analyze
```json
{"code": "def my_func(x):\n  ...", "filename": "opt", "refine": true}
```
Відповідь: `{"diagrams": [...], "summary": "..."}`

### POST /analyze_folder
```json
{"folder_path": "services/drakon-agent", "max_files": 20, "refine": true}
```

## architect-agent (порт 8766, https://architect-agent.exodus.pp.ua)

| Метод | Шлях | Опис |
|-------|------|------|
| GET | /health | Статус |
| POST | /chat | Архітектурний діалог |
| GET | /files/list?path=. | Список файлів проекту |
| GET | /files/read?path=X | Читання файлу |
| GET | /memory/list | Список файлів пам'яті |
| GET | /memory/get?filename=X | Читання пам'яті |
| POST | /memory/save | Запис пам'яті (GitHub) |

## docs-agent (порт 8767, https://docs-agent.exodus.pp.ua)

| Метод | Шлях | Опис |
|-------|------|------|
| GET | /health | Статус |
| POST | /chat | Документальний діалог |
| GET | /docs/list?path=. | Список файлів документації |
| GET | /docs/read?path=X | Читання doc-файлу |
| GET | /memory/list | Список пам'яті |

## Cloudflare Worker (https://drakon-mcp-worker.maxfraieho.workers.dev)

MCP endpoints:
- drakon.saveDiagram, drakon.listDiagrams, drakon.getDiagram
- drakon.analyzecodebase, drakon.agentchat

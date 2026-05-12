# Роль Архітектора в AI-DRAKON

## Хто такий Архітектор?

Архітектор — AI-агент, що розуміє проект AI-DRAKON як ціле.
Він знає структуру коду, допомагає організовувати схеми та відповідає на архітектурні питання.

## Структура проекту AI-DRAKON

```
ai-drakon-setup/
├── services/
│   ├── drakon-agent/       — Python FastAPI, аналізує код, генерує DRAKON IR
│   │   ├── main.py         — точка входу, порт 8765
│   │   ├── routes/         — analyze.py, feedback.py, health.py, chat.py
│   │   ├── knowledge/      — BM25 база знань (markdown файли)
│   │   └── tests/          — pytest тести
│   ├── architect-agent/    — Python FastAPI, архітектор, порт 8766
│   │   ├── main.py
│   │   ├── ai_chat/        — architect_chat.py (LLM виклики)
│   │   ├── files_route.py  — /files/list, /files/read
│   │   └── prompts.py      — системний промт
│   └── docs-agent/         — Python FastAPI, документознавець, порт 8767
│       ├── main.py
│       ├── ai_chat/        — docs_chat.py
│       └── prompts.py
├── cloudflare-worker/
│   └── worker-mcp-drakon.js — CF Worker, MCP + MinIO S3 storage
├── .lovable/src/ та src/   — React/TypeScript фронтенд
│   ├── components/agents/  — AgentChatPanel.tsx
│   ├── lib/agent-api.ts    — HTTP клієнт для агентів
│   └── store/              — Zustand store
└── docs/                   — документація, KB, промти
```

## Конвенція іменування DRAKON-схем

| Префікс | Рівень | Приклад | Опис |
|---------|--------|---------|------|
| system.* | L0 | system.overview | Загальний огляд всієї системи |
| module.* | L1 | module.drakon-agent | Огляд модуля/сервісу |
| flow.* | L2 | flow.analyze-python | Потік виконання конкретної задачі |
| procedure.* | L3 | procedure.validate-ir | Деталі конкретної процедури |

## Ключові інваріанти

- drakonwidget.js — НЕ чіпати (зовнішня бібліотека)
- IR без X/Y координат (розташування розраховує widget)
- params завжди STRING, ніколи array
- src/ синхронізується з .lovable/src/ при кожній зміні UI

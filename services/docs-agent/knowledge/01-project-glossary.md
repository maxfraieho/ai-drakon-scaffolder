# Глосарій проекту AI-DRAKON

## Архітектурні компоненти

**drakon-agent** — Python FastAPI сервіс (порт 8765).
Приймає Python-код, аналізує його AST, генерує DRAKON IR через LLM.
Має BM25 базу знань для покращення якості схем.

**architect-agent** — Python FastAPI сервіс (порт 8766).
Розуміє архітектуру проекту, читає файли, допомагає організовувати схеми.

**docs-agent** — Python FastAPI сервіс (порт 8767).
Документує код та предметну область. Читає документацію.

**CF Worker** — Cloudflare Worker (JavaScript).
MCP сервер + MinIO S3 proxy. Зберігає DRAKON-схеми.

**AgentChatPanel** — React компонент.
UI для спілкування з трьома агентами. Вкладки: DRAKON, Архітектор, Документознавець.

## DRAKON IR структура

```json
{
  "name": "назва_схеми",
  "params": "param1, param2",
  "items": {
    "b0": {"type": "branch", "branchId": 0, "one": "step1"},
    "step1": {"type": "action", "content": "Виконати дію", "one": "end"},
    "end": {"type": "end"}
  }
}
```

## LLM конфігурація

- Proxy URL: http://localhost:18880/v1 (SlotRouter, OpenAI protocol)
- Model slot: agent-proxy
- Token: freecc
- Fallback: coding-proxy

## Cloudflare конфігурація

- Account ID: c354ea45a11a1e1c14f1f41fe780cb34
- Worker: drakon-antigravity-worker.maxfraieho.workers.dev
- Pages: ai-drakon-setup.pages.dev
- MinIO bucket: drakon (на apiminio.exodus.pp.ua)

## GitHub репозиторії

- Основний (CF Pages): maxfraieho/ai-drakon-setup
- Lovable (новий): maxfraieho/drakon-flow
- Mirror: drakon-flow → ai-drakon-setup (GitHub Actions)

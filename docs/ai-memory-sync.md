# AI-Memory Cross-Agent Sync

Методика синхронізації сесій між агентами: Claude Code (OrangePi), AGY phone, AGY3 tablet.

## Інфраструктура

| Компонент | Значення |
|-----------|---------|
| Server | dev server (192.168.3.184) |
| Port | 49374 |
| Tailscale | http://100.113.140.25:49374 (primary) |
| LAN fallback | http://192.168.3.184:49374 |
| Shared project | `vokov` |
| Wiki UI | http://192.168.3.184:49374/web |
| Docker | `docker restart ai-memory` |

## Принцип роботи

1. Кожен агент при **старті сесії** реєструється через hook + читає що зробили інші
2. Кожен агент при **кінці сесії** пише wiki-сторінку з підсумком
3. Всі пишуть/читають `project="vokov"` — спільний namespace

```
Agent start → POST /hook?event=SessionStart (cwd=/home/vokov, project=vokov)
           → memory_recent(project=vokov)  ← бачить сторінки всіх агентів

Agent stop  → POST /hook?event=Stop
           → memory_write_page(project=vokov) → sessions/<agent>-latest.md
```

## Агенти та скрипти

| Агент | ID | Start | End |
|-------|----|-------|-----|
| Claude Code | claude-code | SessionStart hook (auto) | Stop hook (auto) |
| AGY phone | agt-ogy | `~/bin/ai-memory-start.sh` | `~/bin/ai-memory-end.sh "summary"` |
| AGY3 tablet | agt-ogy3 | `~/bin/ai-memory-start.sh` | `~/bin/ai-memory-end.sh "summary"` |

## Shared Wiki Pages (project=vokov)

- `sessions/claude-latest.md` — останній Claude Code
- `sessions/agt-ogy-latest.md` — останній AGY phone
- `sessions/agt-ogy3-latest.md` — останній AGY3 tablet

## MCP API (пряме звернення)

```bash
# Читати останні зміни
curl -s -X POST "http://100.113.140.25:49374/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_recent","arguments":{"limit":5,"project":"vokov"}}}'

# Написати нотатку про важливу зміну
curl -s -X POST "http://100.113.140.25:49374/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"memory_write_page","arguments":{"path":"notes/change-2026-05-29.md","body":"# Зміна\\n...","project":"vokov","tier":"episodic","tags":["change"]}}}'
```

## Поширення важливих змін між агентами

Якщо зробив щось значиме (не просто завдання, а архітектурне рішення):

```bash
# Ручний запис — всі побачать при наступному старті
bash ~/bin/ai-memory-end.sh "короткий опис що змінив"
```

Claude Code: при закінченні сесії Stop hook записує автоматично.

## Семантичні зв'язки
**Цей документ є частиною:** [[INDEX]]

**Цей документ пов'язаний з:**
- [[INDEX]] — переглянути всі документи розділу
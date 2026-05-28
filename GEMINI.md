# AI-DRAKON — Середовище розробки (Termux/AGY)

## Проект
**AI-DRAKON LangStudio** — платформа для перетворення коду в DRAKON-діаграми з multi-agent pipeline.

Репозиторій: `~/workspace/ai-drakon-scaffolder/`
Git: `git@github.com:maxfraieho/ai-drakon-scaffolder.git`
Live UI: https://ai-drakon-scaffolder.pages.dev/

## Агенти (на сервері 192.168.3.184)
- **drakon-agent** :8765 — AST→DRAKON IR (Python+JS/TS), 21/21 тестів ✅
- **architect-agent** :8766 — LangGraph pipeline A/B + SSE stream
- **docs-agent** :8767 — docs CRUD + notes + projects registry

## Cloudflare Worker
- URL: https://drakon-mcp-worker.maxfraieho.workers.dev
- Auth: `Bearer drakon-mcp-2026`
- Config: `wrangler.jsonc`

## Сервер розробки
```bash
SSH: sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184
Workspace: /home/vokov/workspace/ai-drakon-scaffolder/
```

## Frontend
- `src/` та `.lovable/src/` синхронізовані вручну
- Monaco editor, collapsible panels, DRAKON граф-редактор на /agents
- Theme: dark, Tailwind + shadcn/ui

## Відкриті баги (2026-05-27)
- Немає критичних відкритих багів (BUG-8 вирішено ✅)

## Git workflow
```bash
git add <файли>   # НЕ git add -A
git commit -m "type(scope): message"
git push origin main
```
Ніколи не комітити: `config.json`, `.env`, `wrangler.toml` з секретами

## Правила роботи (AGY)
1. Один крок за раз, перевіряй результат
2. При помилці — зупинись, поясни, запитай
3. Не додавай features за межами задачі
4. Перед push — перевір `git diff`
5. Використовуй SSH для операцій на сервері 192.168.3.184

## MCP Tools
- **mempalace**: пам'ять між сесіями (`python3 -m mempalace mcp`)
- **notebooklm**: знання проекту (SSE MCP на 192.168.3.234:8002)
- Конфіг: `~/.gemini/config/mcp_config.json`

## NotebookLM — Ключові Notebooks

| Назва | ID | Призначення |
|-------|----|-------------|
| **drn-ai** | `6139067a-5776-4b29-8869-7c9f9aed475c` | Головна KB: архітектура, MCP docs, конфіги |
| **AI Drakon Scaffolder Codebase Analysis** | `2521c922-efa1-4a12-a106-a8f4d2c386ab` | Аналіз кодобази |
| **Antigravity Claude Proxy** | `3d56dc81-7997-4723-8c99-f6560ca6dae0` | ClaudeProxy docs |
| **MemPalace** | `5551cbff-da12-4c87-b657-9f7c71b59ed6` | MemPalace API docs |

### Типові операції
```
# Запит до KB проекту
notebooklm_chat_ask(notebook_id="6139067a-5776-4b29-8869-7c9f9aed475c", query="питання")

# Додати оновлений файл до KB
notebooklm_add_source_text(notebook_id="6139067a-...", title="назва", content="...")

# Перелік джерел
notebooklm_list_sources(notebook_id="6139067a-...")
```

## Корисні команди
```bash
# Перевірити агентів
curl http://192.168.3.184:8765/health
curl http://192.168.3.184:8766/health

# Логи на сервері
sshpass -p '805235io.' ssh vokov@192.168.3.184 'tail -20 /var/log/uav-watcher.log'

# Frontend dev
cd ~/workspace/ai-drakon-scaffolder && npm run dev

# Тести
cd ~/workspace/ai-drakon-scaffolder && npm test

# MemPalace пошук
python3 -m mempalace search "питання" --wing ai_drakon_scaffolder
```


## AI-Memory — Синхронізація сесій (НОВИЙ шар, 2026-05-28)

**Сервер:** `http://192.168.3.184:49374` (Docker, `--network host`)
**Web UI:** `http://192.168.3.184:49374/web`
**GitHub:** `https://github.com/maxfraieho/antigravity-claude-proxy` (AGY proxy з /v1/chat/completions)

### Lifecycle hooks (AGY)
```bash
# На початку кожної сесії:
~/bin/ai-memory-start.sh  # → POST /hook?event=SessionStart → queued 202

# На кінці сесії:
~/bin/ai-memory-end.sh    # → POST /hook?event=Stop
```

### MCP endpoint
```
POST http://192.168.3.184:49374/mcp
POST http://192.168.3.184:49374/hook?event=<EventName>
```

## Протокол співпраці Claude ↔ AGY (оновлено 2026-05-28)

### Три шари синхронізації пам'яті

| Шар | Інструмент | Призначення | Хто пише |
|-----|-----------|-------------|-----------|
| **Оперативна** | MemPalace | semantic search, diary, KG між сесіями | AGY + Claude |
| **Кросс-агентна** | ai-memory | автоматичний SessionStart/End capture, FTS wiki | автоматично (hooks) |
| **Знання-база** | NotebookLM | довгострокові доки, Q&A, artifacts | Claude (вручну) |

### Черга задач (TASKS.md)
```
Claude пише → development/TASKS.md → git push
AGY читає → виконує → позначає [x] → diary → git push
Claude перевіряє → git log або mempalace diary read (agent: agt-ogy)
```

### Сигнали для AGY
- Claude пише задачі → `development/TASKS.md` (детальні інструкції)
- AGY записує результати → `mempalace diary write --agent agt-ogy "SESSION:..."`
- Новий інструмент: ai-memory hooks фіксують кожну сесію автоматично

## AGY Proxy — налаштування
- **URL:** `https://agy.exodus.pp.ua` (через cloudflared OrangePi)
- **Локальний:** `http://192.168.3.195:8080`
- **Endpoints:** `/v1/messages` (Anthropic) + `/v1/chat/completions` (OpenAI)
- **Health:** `https://agy.exodus.pp.ua/health`
- **Моделі:** gemini-2.5-pro, gemini-2.5-flash, claude-sonnet-4-6, claude-opus-4-6-thinking

## TASKS.md — координація з Claude
Файл `development/TASKS.md` — черга задач від Claude (оркестратора).
Формат: `[ ] TASK-N: опис` → після виконання → `[x] TASK-N: опис ✅`
Після кожного completed task → записати в MemPalace diary (`mempalace diary write`).

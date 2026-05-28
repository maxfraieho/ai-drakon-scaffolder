# HANDOFF — AI-DRAKON / AGY Termux

Оновлено: 2026-05-28 10:46 (overnight sprint results)
Проект: AI-DRAKON Platform
HEAD: 92e6d53

## Стан системи
- **AGY Termux** (`192.168.3.195`): ACTIVE, SSH server running on `:8022`
- **AGY Proxy** (`https://agy.exodus.pp.ua`): UP, OpenAI & Anthropic dual-protocol API endpoints running on `:8080`
- **ai-memory** (`192.168.3.184:8790`): UP, session logs mapped & start/end lifecycle scripts configured
- **NotebookLM MCP** (`192.168.3.234:8002`): UP, streamable-http FastAPI server running on `:8002`
- **MemPalace**: Semantic search, diaries & Knowledge Graph active
- **drakon-agent** (`:8765`), **architect-agent** (`:8766`), **docs-agent** (`:8767`): active on dev server

## Виконані задачі (Overnight Sprint 2026-05-28)
- [x] **TASK-11**: Створено повну документацію системи `docs/COLLABORATION.md` (9 розділів: Overview, Infrastructure, Memory, Protocol, AGY Proxy, Skills, CF Tunnel, Agent Config, Roadmap) та завантажено в NotebookLM `drn-ai` (Commit: `5b95ac5`)
- [x] **TASK-1**: Запитано NotebookLM `drn-ai` про огляд поточного стану проекту AI-DRAKON і успішно збережено відповідь у MemPalace (Commit: `4667c1f`)
- [x] **TASK-2**: Синхронізовано оновлений `GEMINI.md 2026-05-28` як нове джерело до NotebookLM `drn-ai` (Commit: `92e6d53`)
- [x] **TASK-3**: Додано провайдер `AGY` до `AgentLlmCard.tsx` (src/ та .lovable/src/)
- [x] **TASK-4**: Додано `AGY (Gemini)` до стандартних CLI-агентів в `settings-storage.ts`
- [x] **TASK-9**: Встановлено `ai-memory` сервер на `192.168.3.184:8790` та створено запускні/завершальні хук-скрипти `ai-memory-start.sh` / `ai-memory-end.sh` на Termux
- [x] **TASK-10**: Створено та опубліковано GitHub-репозиторій `maxfraieho/antigravity-claude-proxy` із покращеним форком проксі (підтримка OpenAI `/v1/chat/completions`) та README

## Пропущені задачі (опціонально / на свій розсуд)
- [ ] **TASK-5**: skipped (автоматичне налаштування провайдера у localStorage при чистій сесії, необов'язково для MVP)
- [ ] **TASK-6**: skipped (генерація документації через docs-agent API)

## Доступ
- **AGY Termux SSH**: `sshpass -p "123456" ssh -p 8022 u0_a284@192.168.3.195`
- **Dev Server SSH**: `sshpass -p "805235io." ssh vokov@192.168.3.184`
- **RPi 4B SSH (NotebookLM MCP)**: `sshpass -p "805235io." ssh vokov@192.168.3.234`
- **AGY Proxy Endpoint**: `https://agy.exodus.pp.ua`

## NotebookLM IDs
- **drn-ai (Main Project KB)**: `6139067a-5776-4b29-8869-7c9f9aed475c`
- **Codebase Analysis**: `2521c922-efa1-4a12-a106-a8f4d2c386ab`
- **AI-Memory**: `9386840e-d2e2-4c16-996a-a13f87898667`

## Координація сесій
- Claude оркеструє завдання через `development/TASKS.md`
- AGY виконує завдання, відмічає `[x]`, записує checkpoint у MemPalace diary та робить push
- Claude перевіряє прогрес через `git log` або `mempalace diary read --agent agt-ogy`

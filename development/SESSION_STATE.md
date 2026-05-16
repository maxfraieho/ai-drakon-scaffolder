# SESSION STATE — 2026-05-16 (день, сесія 4)

## Машини
| Машина | Роль | Доступ |
|--------|------|--------|
| 192.168.3.161 (OrangePi PC2) | Claude Code — ця сесія | pass `805335io` (без крапки!) |
| 192.168.3.184 (Alpine Linux) | Dev server, репо, PinchTab, агенти | `sshpass -p '805235io.' ssh vokov@192.168.3.184` |

## Репозиторії (на 192.168.3.184)
| Репо | GitHub | Шлях |
|------|--------|------|
| ai-drakon-setup | maxfraieho/ai-drakon-setup | `~/workspace/ai-drakon-setup/` |
| drakon-flow-designer | maxfraieho/drakon-flow-designer | (новий Lovable repo, remote: drakon-flow-designer) |

**КРИТИЧНО:** Після будь-яких змін пушити в ОБИДВА remote (`origin` + `drakon-flow-designer`).
**Mirror:** drakon-flow-designer → ai-drakon-setup via GitHub Action (MIRROR_TOKEN ✅)

## Live URLs
- UI: https://ai-drakon-setup.pages.dev/  (login: `owner` / `805235io`)
- Worker: https://drakon-mcp-worker.maxfraieho.workers.dev
- Architect tunnel: https://architect-agent.exodus.pp.ua
- Drakon tunnel: https://drakon-agent.exodus.pp.ua

## Стан Спринтів

| Sprint | Опис | Стан |
|--------|------|------|
| Sprint 0 | Bug fixes | ✅ |
| Sprint 1 | SSE Streaming | ✅ верифіковано |
| Sprint 2 | Monaco Editor + localStorage History | ✅ верифіковано Q |
| Sprint 3 | KB Integration (SQLite + RAG) | ✅ верифіковано bundle |
| **Sprint 4** | JS/TS підтримка в drakon-agent | 🔵 ПЛАН — виконати ПІСЛЯ Sprint 5 |
| **Sprint 5** | Agent Pipeline Management System | ✅ ВИКОНАНО (сесія 3) |

## Sprint 5 — Pipeline Management ✅ COMPLETE

**Commit range:** `a535101`..`5bad869` (6 commits, pushed → origin + drakon-flow-new)

### Що зроблено (Tasks 1–7)

| Task | Опис | Commit | Стан |
|------|------|--------|------|
| 1 | `services/shared/drakon_shared/` Python package + pip install -e | a535101 | ✅ |
| 2 | 4x Pipeline JSON configs (architect-a/b, drakon-analyze, docs-chat) | a535101 | ✅ |
| 3 | Mount `pipeline_config_router` на architect-agent `/v1/agents/pipeline` | a7a0c29 | ✅ |
| 4 | Cloudflare Worker proxy `/v1/agents/pipeline*` | 6ad495b | ✅ deployed |
| 5 | `src/lib/pipeline-config-api.ts` (fetchPipeline, savePipeline, validate) | e49d422 | ✅ |
| 6 | `src/lib/pipeline-to-drakon.ts` (BFS irToPipeline, widget types, branch/0) | bc32081 | ✅ |
| 7 | `DrakonEditor.onSaveOverride` + `PipelineEditorPage` + TanStack route | 5bad869 | ✅ |

### Виправлення відносно плану (застосовано під час виконання)
- `PipelineConfig` з `pipeline-config-api.ts` (nodes+edges), не steps
- `irToPipeline` — BFS обхід графа, не тільки `item.one`
- `PipelineEditorPage` — `Route.useParams()` з TanStack Router, `fetchPipeline()` з api
- b0: `type: "branch"`, `branchId: 0` (число), `import from "@/types/drakonwidget"`

### Smoke tests (верифіковано)
- `✓ drakon_shared OK` — Python import
- `✓ architect-a: 6 nodes, 9 edges` + 3 others — список пайплайнів
- `GET http://localhost:8766/v1/agents/pipeline` → 4 configs JSON
- `GET https://drakon-mcp-worker.maxfraieho.workers.dev/v1/agents/pipeline` → 401 (auth OK)
- `tsc --noEmit --skipLibCheck` → exit 0

### Що ще потрібно (Lovable side)
- Промт 40 (`lovable-prompts/40-pipeline-editor.md`) ще НЕ застосований у Lovable chat
- Потрібно вставити в Lovable → CF Pages deploy → PinchTab verify
- Промт 40 додає: Edit кнопки в AgentSidebar, hideChrome для /agents/pipeline/

## Sprint 4 — JS/TS Support (НАСТУПНИЙ)

**План:** `docs/plans/2026-05-16-js-ts-support.md`

| Task | Опис | Стан |
|------|------|------|
| 1 | pyproject.toml — tree-sitter deps | ⏳ |
| 2 | Failing tests для JSAnalyzer | ⏳ |
| 3 | Реалізація `analyzer/js_analyzer.py` | ⏳ |
| 4 | Routing у /analyze по розширенню | ⏳ |
| 5 | Restart drakon-agent + smoke test | ⏳ |
| 6 | Lovable prompt 39 — lang selector frontend | ⏳ |

**Примітка:** tree-sitter 0.25.2 + tree-sitter-javascript/typescript вже у `.venv`.

## UX-промти Lovable

| Промт | Опис | Стан |
|-------|------|------|
| 34-38 | Nav, palette, sidebar, Save to KB | ✅ виконані |
| **39** | JS/TS lang selector | ⏳ чекає Sprint 4 backend |
| **40** | Pipeline Editor (DRAKON widget) | ⏳ вставити в Lovable chat → verify |

## Агенти (на 192.168.3.184)

| Агент | Port | Tunnel | Supervisor |
|-------|------|--------|-----------|
| drakon-agent | 8765 | https://drakon-agent.exodus.pp.ua | ai-drakon-agent |
| architect-agent | 8766 | https://architect-agent.exodus.pp.ua | ai-architect-agent |
| docs-agent | 8767 | https://docs-agent.exodus.pp.ua | ai-docs-agent |

Всі три: `services/drakon-agent/.venv/bin/python3`
Перезапуск: `rc-service ai-architect-agent restart`

## PinchTab
- Host: 192.168.3.184, token: `0117419fcfb5de5d82220c1f9da8de97`
- КРИТИЧНО: НІКОЛИ не використовувати MCP screenshot tool (base64 в контекст)
- curl raw=true → save → scp → Read

## Proxy / LLM (192.168.3.184)
- Port 18880: OpenAI protocol (PROXY_URL=http://localhost:18880/v1)
- PROXY_TOKEN=freecc, PROXY_MODEL=agent-proxy

## Архітектурні інваріанти (НЕ ПОРУШУВАТИ)
- `drakonwidget.js` — НІКОЛИ
- IR без X/Y координат
- `params` — завжди STRING
- `src/` синхронізується з `.lovable/src/`
- `git add .` ЗАБОРОНЕНО
- Push → ОБИДВА remote (origin + drakon-flow-new)
- `DrakonDiagram` з `@/types/drakonwidget` (не `@/types/drakon`)
- b0: type="branch", branchId=0 (число, не рядок)

## Git log (2026-05-16 ніч)
```
5bad869  feat(sprint5): DrakonEditor onSaveOverride + PipelineEditorPage + TanStack route
bc32081  feat(sprint5): PipelineConfig <-> DrakonDiagram converters (BFS, widget types, branch/0)
e49d422  feat(sprint5): TypeScript pipeline config API client
6ad495b  feat(sprint5): worker proxy for /v1/agents/pipeline
a7a0c29  feat(sprint5): mount pipeline_config_router on architect-agent
a535101  feat(sprint5): drakon_shared package + pipeline JSON configs for all 4 pipelines
d184ed3  docs(sprint5): implementation plan + lovable prompt 40
```

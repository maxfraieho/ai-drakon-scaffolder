# SESSION STATE — 2026-05-17 (сесія 4)

## Машини
| Машина | Роль | Доступ |
|--------|------|--------|
| 192.168.3.161 (OrangePi PC2) | Claude Code — ця сесія | pass `805235io.` (з крапкою!) |
| 192.168.3.184 (Alpine Linux) | Dev server, репо, PinchTab, агенти | `sshpass -p '805235io.' ssh vokov@192.168.3.184` |

## Репозиторії (на 192.168.3.184)
| Репо | GitHub | Remote name | Призначення |
|------|--------|-------------|-------------|
| ai-drakon-setup | maxfraieho/ai-drakon-setup | origin | CF Pages source (будує сайт) |
| drakon-flow-designer | maxfraieho/drakon-flow-designer | drakon-flow-designer | Новий Lovable repo |

**КРИТИЧНО:** Після будь-яких змін пушити в ОБИДВА remote:
```
git push origin main
git push drakon-flow-designer main
```
Mirror: drakon-flow-designer → ai-drakon-setup via GitHub Action (MIRROR_TOKEN ✅)

**Старі remotes (більше не використовувати):**
- `drakon-flow` → maxfraieho/drakon-flow.git (obsolete)
- `drakon-flow-new` → maxfraieho/drakon-flow-90aa2999.git (obsolete)

## Live URLs
- UI: https://ai-drakon-setup.pages.dev/ (login: `owner` / `805235io`)
- Worker: https://drakon-mcp-worker.maxfraieho.workers.dev
- Architect tunnel: https://architect-agent.exodus.pp.ua
- Drakon tunnel: https://drakon-agent.exodus.pp.ua
- Docs tunnel: https://docs-agent.exodus.pp.ua

## Стан Спринтів

| Sprint | Опис | Стан |
|--------|------|------|
| Sprint 0 | Bug fixes | ✅ |
| Sprint 1 | SSE Streaming | ✅ верифіковано |
| Sprint 2 | Monaco Editor + localStorage History | ✅ верифіковано Q |
| Sprint 3 | KB Integration (SQLite + RAG) | ✅ верифіковано bundle |
| **Sprint 4** | JS/TS підтримка в drakon-agent | 🔵 НАСТУПНИЙ |
| **Sprint 5** | Agent Pipeline Management System | ✅ ВИКОНАНО + BUG FIXES |

## Sprint 5 — Pipeline Management ✅ COMPLETE (з виправленнями)

**Commit range:** `a535101`..`73f3b7f`

### Баги знайдені та виправлені (code review сесія 4)

| Commit | Файл | Проблема | Фікс |
|--------|------|----------|------|
| `359aca2` | `PipelineEditorPage.tsx:97` | `diagramId={}` — template literal обрізано | `diagramId={\`pipeline-\${config.id}\`}` |
| `359aca2` | `pipeline-to-drakon.ts:15` | `nodeToItem.set(node.id, )` — 2-й аргумент відсутній | `nodeToItem.set(node.id, \`\${prefix}\${counter++}\`)` |
| `73f3b7f` | `CodeGenerationPanel.tsx:152` | `auth_token` → `jwt` | localStorage key consistency |
| `73f3b7f` | `CodeAnalysisPanel.tsx:92` | `auth_token` → `jwt` | те саме |
| `73f3b7f` | `pipeline-config-api.ts:1-2,18` | bare identifiers замість string literals | `"action" \| "decision" \| ...` |
| `73f3b7f` | `.github/workflows/mirror-to-ai-drakon.yml` | self-referential loop видалено | GH Actions failures усунуті |

**CF Pages:** `359aca2` → deploy success ✅, `73f3b7f` → build активний (2026-05-17)

### Smoke tests (верифіковано)
- CF Pages build: ✅ success (`29ad0acb`)
- Pipeline endpoints: `GET /v1/agents/pipeline` → 4 configs JSON ✅
- Worker auth: `GET https://drakon-mcp-worker.../v1/agents/pipeline` → 401 ✅

## Lovable Migration ✅ (сесія 4)

- Новий Lovable repo: `git@github.com:maxfraieho/drakon-flow-designer.git`
- Remote додано: `git remote add drakon-flow-designer https://github.com/maxfraieho/drakon-flow-designer.git`
- MIRROR_TOKEN встановлено: `gh secret set MIRROR_TOKEN --repo maxfraieho/drakon-flow-designer`
- Mirror Action: `drakon-flow-designer` → `ai-drakon-setup` (GitHub Actions) ✅
- Force push: обидва repo на `73f3b7f` ✅

### Підключення нового Lovable
1. Lovable → новий проект → Connect GitHub → `maxfraieho/drakon-flow-designer`
2. Перший промт: `docs/templates/lovable-migration/lovable-prompts/00-handoff.md`
3. Другий промт: `lovable-prompts/40-pipeline-editor.md`

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
| **40** | Pipeline Editor (DRAKON widget) | ✅ виконано + верифіковано |

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
- `src/` синхронізується з `.lovable/src/` при кожній зміні
- `git add .` ЗАБОРОНЕНО
- Push → ОБИДВА remote (origin + drakon-flow-designer)
- `DrakonDiagram` з `@/types/drakonwidget` (не `@/types/drakon`)
- b0: type="branch", branchId=0 (число, не рядок)
- Template literals в JSX/TS треба перевіряти після SSH-запису (backticks обрізаються!)

## Git log (2026-05-17 ніч)
```
73f3b7f  fix(review): auth token key, TS union types, stale mirror workflow
359aca2  fix: template literals stripped in Sprint5 files — diagramId + nodeToItem
092276e  chore: migrate Lovable to drakon-flow-designer repo + cleanup screenshots
5bad869  feat(sprint5): DrakonEditor onSaveOverride + PipelineEditorPage + TanStack route
bc32081  feat(sprint5): PipelineConfig <-> DrakonDiagram converters (BFS, widget types, branch/0)
e49d422  feat(sprint5): TypeScript pipeline config API client
6ad495b  feat(sprint5): worker proxy for /v1/agents/pipeline
a7a0c29  feat(sprint5): mount pipeline_config_router on architect-agent
a535101  feat(sprint5): drakon_shared package + pipeline JSON configs for all 4 pipelines
```

## Важливий урок (template literals via SSH)
При записі файлів через SSH з Python/shell — template literals з backticks (`` ` ``) можуть обрізатись.
**Рішення:** писати Python fix-скрипти локально → `scp` на сервер → `python3 /tmp/fix.py`

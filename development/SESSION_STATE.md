# SESSION STATE — 2026-05-17 (сесія 5)

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
git push drakon-diagram-flow main
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

## ⚠️ CF Pages API токен
`cfat_FOcTd6CcSirP3FVgtTTUaOtw9ddCi2IXrlSd8SJ4689dc07b` — **ПРОСТРОЧЕНИЙ** (auth error 10000).
Потрібно оновити через https://dash.cloudflare.com/ → My Profile → API Tokens.

## Стан Спринтів

| Sprint | Опис | Стан |
|--------|------|------|
| Sprint 0 | Bug fixes | ✅ |
| Sprint 1 | SSE Streaming | ✅ верифіковано |
| Sprint 2 | Monaco Editor + localStorage History | ✅ верифіковано Q |
| Sprint 3 | KB Integration (SQLite + RAG) | ✅ верифіковано bundle |
| **Sprint 4** | JS/TS підтримка в drakon-agent | ✅ ВИКОНАНО (21/21 тестів) |
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

## Lovable Migration ✅ (сесія 4)

- Новий Lovable repo: `git@github.com:maxfraieho/drakon-flow-designer.git`
- Remote: `git remote add drakon-diagram-flow https://github.com/maxfraieho/drakon-diagram-flow.git
- MIRROR_TOKEN встановлено ✅
- Mirror Action: `drakon-flow-designer` → `ai-drakon-setup` ✅

## UX-промти Lovable

| Промт | Опис | Стан |
|-------|------|------|
| 34-38 | Nav, palette, sidebar, Save to KB | ✅ виконані |
| 39 | JS/TS lang selector | ✅ виконано (Lovable) |
| 40 | Pipeline Editor (DRAKON widget) | ✅ виконано + верифіковано |
| **41** | PipelineFlowGraph з `@xyflow/react` | ✅ виконано (сесія 5) |

## Prompt 41 — PipelineFlowGraph ✅ COMPLETE (сесія 5)

**Commit:** `813777e` "Додав FlowGraph у AgентStudio" (Lovable)
**Наш commit:** `c5139af` "feat(lovable): prompt 41 — PipelineFlowGraph with @xyflow/react"

**Що зроблено:**
- `src/components/agents/PipelineFlowGraph.tsx` — новий компонент з `@xyflow/react`
  - 3 кастомних типи вузлів: `ActionNode`, `DecisionNode`, `TerminatorNode`
  - Топологічний layout (без X/Y координат)
  - Фетч реальних даних з `fetchPipeline(id)` (API, не статика)
  - Клік по вузлу → `onNodeClick` callback → NodeInspector
- `src/pages/AgentStudioPage.tsx` — замінено `PipelineGraph` → `PipelineFlowGraph`
- `src/styles.css` — ReactFlow dark-mode CSS var overrides
- `package.json` + `.lovable/package.json` — `@xyflow/react: ^12.6.4`
- `src/` синхронізовано з `.lovable/src/` ✅

**Верифікація:**
- Обидва repo мають `813777e` ✅
- `PipelineFlowGraph.tsx` (302 рядки) існує в `src/` і `.lovable/src/` ✅
- `@xyflow/react` в обох `package.json` ✅
- CF Pages build — перевірити вручну (токен прострочений)

## Sprint 4 — JS/TS Support ✅ COMPLETE

**Результат:** 21/21 тестів проходять
**Деталі:** `development/SPRINT4_HANDOFF.md`

## Агенти (на 192.168.3.184)

| Агент | Port | Tunnel | Supervisor |
|-------|------|--------|-----------|
| drakon-agent | 8765 | https://drakon-agent.exodus.pp.ua | ai-drakon-agent |
| architect-agent | 8766 | https://architect-agent.exodus.pp.ua | ai-architect-agent |
| docs-agent | 8767 | https://docs-agent.exodus.pp.ua | ai-docs-agent |

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

## Git log (2026-05-17, сесія 5)
```
813777e  Додав FlowGraph у AgentStudio (Lovable)
c5139af  feat(lovable): prompt 41 — PipelineFlowGraph with @xyflow/react
a851b86  (попередні зміни Lovable)
73f3b7f  fix(review): auth token key, TS union types, stale mirror workflow
359aca2  fix: template literals stripped in Sprint5 files
```

## Важливий урок (template literals via SSH)
При записі файлів через SSH — template literals з backticks (`` ` ``) можуть обрізатись.
**Рішення:** писати Python fix-скрипти локально → `scp` на сервер → `python3 /tmp/fix.py`

## Наступні кроки
- Верифікувати CF Pages build для `813777e` (оновити токен або перевірити вручну)
- Перевірити UX в браузері: граф на `/agents` замість горизонтального ряду boxes
- Розпочати наступний Lovable промт (якщо є) або завершити платформу

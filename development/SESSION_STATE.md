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
- Worker: https://drakon-antigravity-worker.maxfraieho.workers.dev
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


---

# SESSION STATE UPDATE — 2026-05-22 (сесії 6–8, prompts 46–55)

## Загальний стан після сесій 6-8

| Sprint / Prompt | Опис | Стан |
|----------------|------|------|
| Prompts 46–49 | renamed done-* | ✅ DONE |
| Prompt 50 | activeProject → docs/notes/graph + fetchNotesGraph authHeaders fix | ✅ DONE |
| Prompt 51 | DiagramsPage → DrakonEditor inline + IR Sheet + full height layout + docs viewport fix | ✅ DONE |
| Prompt 52 commit b7a8fcf | PipelineChat.tsx NEW + PipelinesPage chatOpen + WorkspaceShell Sync tab removed | ✅ DONE |
| Prompts 53–54 | Changes via Lovable | ✅ DONE |
| Prompt 55 commit 3ec63f9 | Refactoring PipelinesPage list→ir→chat + CLI refactor | ✅ DONE |
| Collapsible panels | feat shell: collapsible sidebar + file panel commit 14ec930 | ✅ DONE |
| MinIO sync | feat diagrams: diagram saves → MinIO via CF Worker commit b357984 | ✅ DONE |
| ResizeObserver fix | fix editor: canvas reflow on panel collapse commit f172f7f | ✅ DONE |

## Git log (2026-05-22, топ коміти)

```
f172f7f  fix editor: ResizeObserver reflows canvas when panels collapse/expand
d1a38b0  fix shell: dispatch window.resize after panel collapse so canvas reflows
2c13446  style shell: narrow toggle strips to 8px, accent color on hover
14ec930  feat shell: collapsible sidebar col1 and file panel col2
b357984  feat diagrams: sync diagram saves to MinIO via Cloudflare Worker
a1319dc  fix mobile: DiagramsPage full-width panel + CLI button label on mobile
3ec63f9  Виконав промт 55 refactoring
b7a8fcf  Виконано промт 52 UX-автодослідження (12 files, +428 ins)
c4acb04  code review fixes (6 fixes applied)
```

## Ключові нові компоненти (після сесії 5)

- PipelineChat.tsx — NEW: useAgentChatStore + IrDiagram.context + architect.session
- PipelinesPage.tsx — chatOpen.state + Bot toggle + PipelineChat panel
- WorkspaceShell.tsx — collapsible sidebar/file panel, Sync tab ВИДАЛЕНО
- MinIO integration для збереження діаграм

## Стан на кінець сесій 2026-05-22

- all.green — bugs.clear
- Prompts 46–55: всі виконані
- CF Pages: деплой активний (перевір токен якщо потрібно)

## Наступні кроки

- Перевірити CF Pages build статус після останніх комітів
- Продовжити prompt-список (56+) або новий sprint


---

# SESSION STATE UPDATE — 2026-06-12 (SaaS Sprint 1–2)

## Загальний стан після Sprint 1–2 SaaS

| TASK | Опис | Стан |
|------|------|------|
| TASK-203 | AuthContext.tsx → Appwrite sessions | ✅ DONE |
| TASK-204 | settings-storage.ts — сталі URL-и агентів очищуються | ✅ DONE |
| TASK-205 | authMiddleware + KV session cache в architect-agent-flue | ✅ DONE |
| TASK-206 | Ревізія документації | ✅ DONE |
| TASK-207 | Frontend JWT — authHeaders() в graph-pipeline-api | ◻ pending AGY3 |
| TASK-208 | quotaMiddleware в architect-agent-flue | ◻ pending AGY3 |

## Cloudflare ресурси (створені 2026-06-12)

- D1: `ai-drakon-saas` / `743d5bb0-d09d-4dcc-8329-8ebae8d533f4` (EEUR)
- KV: `SESSION_KV` / `11ed74326f2c431496c2b3dc38ef0208`
- Account: `c354ea45a11a1e1c14f1f41fe780cb34`
- Деталі: `infrastructure/cloudflare-resources.md`

## Appwrite (проект 6a23420a003a04b4997b, fra.cloud.appwrite.io)

- База: `ai-drakon`
- Колекції: user_profiles, team_settings, zone_secrets (encrypted), audit_log
- Схема: `infrastructure/appwrite/schema.ts`

## Агенти (актуально 2026-06-12)

| Агент | Тип | URL | Стан |
|-------|-----|-----|------|
| architect-agent-flue | CF Worker | architect-agent-flue.maxfraieho.workers.dev | live + authMiddleware (не задеплоєний) |
| drakon-agent-flue | CF Worker | drakon-agent-flue.maxfraieho.workers.dev | live |
| docs-agent-flue | CF Worker | docs-agent-flue.maxfraieho.workers.dev | live |
| drakon-agent (Python) | FastAPI :8765 | https://drakon-agent.exodus.pp.ua | **fallback** |
| architect-agent (Python) | FastAPI :8766 | https://architect-agent.exodus.pp.ua | **fallback** |
| docs-agent (Python) | FastAPI :8767 | https://docs-agent.exodus.pp.ua | **fallback** |

Python-агенти (8765–8767) залишаються як fallback до завершення Sprint 5 (консолідація в `ai-drakon-flue`).

## Продакшн-домен

`aidrakon.tech` — цільова топологія: `docs/ARCHITECTURE-SAAS.md §2.4`.

## Застарілі URL-и тунелів (**deprecated**)

- `architect-agent.exodus.pp.ua` → замінено *.workers.dev
- `drakon-agent.exodus.pp.ua` → deprecated
- `docs-agent.exodus.pp.ua` → deprecated
- MinIO збереження — deprecated (замінено Appwrite Storage в архітектурі)

## Git log (2026-06-12, топ коміти)

```
87ac654  chore(tasks): add TASK-207/208 Sprint 2-4 backlog
be4598d  docs: move ARCHITECTURE-SAAS.md to docs/ root
8c2b658  feat(auth): authMiddleware with Appwrite JWT + KV session cache (TASK-205)
```

## Наступні кроки

- TASK-207: Frontend JWT (AGY3) — `src/lib/appwrite-jwt.ts` + `authHeaders()`
- TASK-208: quotaMiddleware (AGY3) — `services/architect-agent-flue/src/middleware/quota.ts`
- Redeploy `architect-agent-flue` після додавання `Workers Scripts:Edit` до CF токена
- Sprint 3: Knowledge Zones CRUD + `connectMcpServer`


---

# SESSION STATE UPDATE — 2026-06-12 ВЕЧІР (компілятор у продукті)

## 🧬 ГОЛОВНЕ: compile loop ПРАЦЮЄ наскрізно

DRAKON-схема → pipelineToIR → **Export mRNA** (drakongen) → `.pseudo.md`
→ **Compile** (рибосома POST /compile) → `{name}.workflow.ts` скачується з UI.
Live-тест: ThreatClassifier → коректний TS (tool→runNode, llm→llmComplete, ТАК/НІ→if/else).

## Задачі вечора (всі верифіковані рев'ю + tsc)

| TASK | Що | Виконавець | Коміт |
|------|----|-----------|-------|
| 209 | llm-client: PROXY_URL/TOKEN з env | AGY3 | f621ac1 |
| 210 | drakon-agent-flue: 6 tsc-помилок | AGY3 | dfa5692 |
| 211 | Агенти воскрешені: тунельні URL (CF error 1042: worker→worker fetch через workers.dev заборонений) | AGY3 | f002935 |
| 212 | llmConfig UI→proxy→агенти→llmComplete | AGY3 | f64b85e..4e84e80 (+ security fix d205ccc: apiKey НЕ персиститься в DO) |
| 213 | UI Фаза A: палітра + IconRail + Evidence Drawer | AGY2 (промпт у development/prompts/) | 5f034f2 |
| 214 | CompilerToolbar | AGY phone | c5515d2 |
| 215 | Export mRNA: wiring готового drakongen | AGY phone | 249749c |
| 216 | Рибосома v1: POST /compile | AGY phone (+фікс \${name} 5ddc057) | a8563aa |
| 217 | Кнопка Compile → /compile | AGY3 | a1be12c |

## Деплої (CF token з Workers Scripts:Edit у ~/.env на .184)

Всі 4 worker-и: architect (494b10d4 — з рибосомою), drakon, docs, drakon-mcp-worker.
`/me` → 401 без JWT (authMiddleware+quotaMiddleware живі).
Деплой: `cd services/X && . ~/.env && npx wrangler deploy --config wrangler.toml`.
УВАГА: esbuild "service was stopped" = паралельний важкий процес на .184 (реіндекс) — дочекатись.

## Інфраструктура

- GitNexus: ПОЛАГОДЖЕНИЙ (FTS/BM25 працює), процедура: exodus-infra/services/gitnexus/README.md. embeddings=0 (опційний overnight).
- OpenDesign LLM: ланцюг agy3→agy2(.30)→phone→local; патчений agy у exodus-infra/services/opendesign/agy.
- cloudflared: agy3.exodus.pp.ua → 192.168.3.204:8080 (LAN, Tailscale AGY3 мертвий rx=0).
- Windows firewall AGY2: правило AGY-proxy-8080 (inbound 8080).

## Флот: уроки дня

- Планшети: ЗАВЖДИ `termux-wake-lock` першим рядком делегування (AGY4 впав без нього).
- AGY4 = 192.168.3.213, u0_a83/805235io, gemini-cli (НЕ antigravity — без LSE).
- AGY phone: клон може застрягти (stash старих змін) — перевіряти git log перед делегуванням.
- AGY2: маршрут промптів через development/prompts/*.md (git pull на ноуті).

## Наступні кроки

1. Шліф промпту рибосоми: модель з env.PROXY_MODEL (не 'gpt-4o').
2. Фаза B-2..B-5: PipelineTimeline, ArtifactTabs, KnowledgeZoneBadge, NodeSemanticsPanel.
3. Sprint 4: Knowledge Zones → рибосома читає KB користувача (MCP-proxy pattern!).
4. Браузер-тест compile loop руками (window.drakongen — browser-only).

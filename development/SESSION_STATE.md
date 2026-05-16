# SESSION STATE — 2026-05-16 (вечір)

## Машини
| Машина | Роль | Доступ |
|--------|------|--------|
| 192.168.3.161 (OrangePi PC2) | Claude Code — ця сесія | pass `805335io` (без крапки!) |
| 192.168.3.184 (Alpine Linux) | Dev server, репо, PinchTab, агенти | `sshpass -p '805235io.' ssh vokov@192.168.3.184` |

## Репозиторії (на 192.168.3.184)
| Репо | GitHub | Шлях |
|------|--------|------|
| ai-drakon-setup | maxfraieho/ai-drakon-setup | `~/workspace/ai-drakon-setup/` |
| drakon-flow-90aa2999 | maxfraieho/drakon-flow-90aa2999 | (mirror для Lovable) |

**КРИТИЧНО:** Після будь-яких змін пушити в ОБИДВА remote (`origin` + `drakon-flow-new`).

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
| **Sprint 4** | JS/TS підтримка в drakon-agent | 🔵 ПЛАН НАПИСАНО, не виконано |

## UX-промти Lovable

| Промт | Опис | Стан |
|-------|------|------|
| 34 | /agents nav link | ✅ (покритий 35) |
| 35 | WorkspaceShell nav fixes (P0) | ✅ верифіковано Q |
| 36 | Command Palette ⌘K | ✅ верифіковано bundle |
| 37 | Mobile sidebar overlay (AgentStudioPage) | ✅ верифіковано Q |
| 38 | Save to KB кнопки | ✅ верифіковано bundle |
| **39** | JS/TS lang selector у CodeAnalysisPanel | ⏳ чекає Sprint 4 backend |

## Sprint 4 — JS/TS Support (ПЛАН ГОТОВИЙ)

**План:** `docs/plans/2026-05-16-js-ts-support.md`
**Останній commit:** `d819d94 docs(plan): Sprint 4 JS/TS support plan`

### Стан Tasks

| Task | Опис | Стан |
|------|------|------|
| 1 | pyproject.toml — tree-sitter deps | ⏳ |
| 2 | Failing tests для JSAnalyzer | ⏳ |
| 3 | Реалізація `analyzer/js_analyzer.py` | ⏳ |
| 4 | Routing у /analyze по розширенню | ⏳ |
| 5 | Restart drakon-agent + smoke test | ⏳ |
| 6 | Lovable prompt 39 — lang selector frontend | ⏳ |

**Примітка:** tree-sitter deps вже встановлені у `.venv` вручну під час дослідження:
```
tree-sitter==0.25.2
tree-sitter-javascript==0.25.0
tree-sitter-typescript==0.23.2
```
Але у `pyproject.toml` ще не прописані (Task 1).

## Що зроблено в цій сесії

### Бекенд
- `services/architect-agent/kb_route.py` — SQLite KB (`POST/GET/DELETE /kb/*`) ✅
- `services/architect-agent/main.py` — підключено `kb_router` ✅
- `cloudflare-worker/worker-mcp-drakon.js` — `handleKb()` + `/v1/kb/*` задеплоєно ✅

### Frontend (via Lovable)
- `src/lib/kb-api.ts` — KB API клієнт ✅
- `CodeAnalysisPanel.tsx` — Save to KB + toast + блокування ✅
- `CodeGenerationPanel.tsx` — Save to KB + toast + блокування ✅
- `AgentStudioPage.tsx` + `AgentSidebar.tsx` — mobile overlay sidebar ✅
- `WorkspaceShell.tsx` — /agents у nav, ⌘K palette, logout confirm ✅
- `CommandPalette.tsx` — новий компонент ✅

### Skills (імпортовано з 192.168.3.184)
Додано 9 нових skills:
- accessibility, cloudflare-inspector, frontend-code-review, pinchtab,
  seo, seo-analyzer, tailwind-validator, typescript-checker, web-design-guidelines
- Пропущено gitnexus-* (7 шт) — зовнішній інструмент не доступний
- Інструкція зворотного експорту: `claude-prompts/EXPORT_SKILLS_FROM_OPI.md`

### Git commits ключові
```
d819d94  docs(plan): Sprint 4 JS/TS support plan
c322407  Додано Save to KB в panels
7b53468  feat(sprint3): KB Integration
bbc0152  docs(claude): skills export instruction
37500f2  feat(lovable-37): mobile sidebar overlay
```

## Наступні кроки (пріоритет)

1. **Sprint 4 Tasks 1–6** — виконати план `docs/plans/2026-05-16-js-ts-support.md`
2. **Lovable prompt 39** — після Task 5 (backend готовий)
3. **P1.4/P1.5 UX** — collapsible sidebar labels (≥1280px) + mobile bottom nav
4. **Sprint 5** — RAG у KB (пошук по внесених прикладах, підключення до architect-agent)

## Архітектурні інваріанти (НЕ ПОРУШУВАТИ)
- `drakonwidget.js` — НЕ ЧІПАТИ
- IR без X/Y координат
- `params` — завжди STRING (ніколи array)
- `src/` синхронізується з `.lovable/src/` при кожній зміні UI
- `git add .` ЗАБОРОНЕНО — тільки конкретні файли
- Після змін — push до ОБОХ remote

## Агенти (на 192.168.3.184)

| Агент | Port | Tunnel |
|-------|------|--------|
| drakon-agent | 8765 | https://drakon-agent.exodus.pp.ua |
| architect-agent | 8766 | https://architect-agent.exodus.pp.ua |
| docs-agent | 8767 | https://docs-agent.exodus.pp.ua |

Запуск:
```bash
REPO_ROOT=~/workspace/ai-drakon-setup PROXY_URL=http://localhost:18880/v1 \
  PROXY_TOKEN=freecc PROXY_MODEL=agent-proxy \
  nohup python3 services/<agent>/main.py > /tmp/<agent>.log 2>&1 &
```

## PinchTab
- Host: 192.168.3.184, token: `0117419fcfb5de5d82220c1f9da8de97`
- КРИТИЧНО: НІКОЛИ не використовувати MCP screenshot tool (base64 в контекст)
- Правильний шлях: `curl raw=true` → save to file → scp → Read

## Proxy / LLM (192.168.3.184)
- Port 18880: OpenAI protocol (PROXY_URL)
- Port 8082: Anthropic protocol
- Slots: standard-proxy, fast-proxy, coding-proxy, reasoning-proxy, agent-proxy

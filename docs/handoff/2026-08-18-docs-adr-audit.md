# Аудит документації ADR/MADR — 2026-08-18

Стан: гілка `main`, commit `47511aaa`. Обсяг: 247 Markdown-файлів поза `docs/adr/`, `specs/`, `node_modules/`, `.lovable/`, `services/*-flue/`. GitNexus `query()` викликано, але MCP повернув `Transport closed`; твердження про `src/` перевірено прямим читанням. `services/*` перевірено напряму. Untracked файли у `services/*-flue` існували до аудиту; не змінювалися.

## Підсумок

- Файлів: 247
- MADR-кандидатів: 14
- Кандидатів без покриття ADR 0001–0009: 9
- Застарілих: 95
- ADR 0001–0009 покривають Appwrite, Cloudflare Worker, GitNexus, MemPalace, FastAPI boundaries, mirror sync, TanStack route tree, arbiter policy, Astryx.
- Confirmed drift: `src/routeTree.gen.ts` і `.lovable/src/routeTree.gen.ts` не ідентичні; `src/routes/tutorial.tsx` існує. `HANDOFF.md` посилається на відсутні файли. `docs/wiki/06_deployment_ci_cd.md:40` посилається на `feature/astryx-ui`, checkout — `main`.

## Таблиця

| Файл | Тип | Існуючий ADR | Що не так / чого бракує | Рекомендація |
|---|---|---|---|---|
| `AGENTS.md` | Reference | 0001–0009 | Code paths існують: tutorial route, Astryx components, Appwrite JWT, Worker. Sync rule має дубль `cp`/`rsync`. | оновити |
| `claude-prompts/claude-code-phase2-prompts.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `claude-prompts/EXPORT_SKILLS_FROM_OPI.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `claude-prompts/gemini-drakon-kb-research.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `claude-prompts/gemini-research-python-drakon.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `claude-prompts/IMPORT_SKILLS.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `CLAUDE.md` | Reference | — | Процедурний/agent guide; code contradiction не виявлено. `CLAUDE.md`/`GEMINI.md` дублюють `AGENTS.md`. | залишити як є |
| `cloudflare-worker/README.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `CONTEXT.md` | Reference | 0001–0004 | Domain glossary; перевірити claims про semantic-graph, `MCP_API_KEY`, Worker against current files. | оновити |
| `DEPLOY_CLOUDFLARE_PAGES.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/agents/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/agents/agy/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/agents/agy/00-bootstrap/SKILL.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/agents/agy/01-docs-agent/SKILL.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/02-repo-analyzer/SKILL.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/03-dataview-dql/SKILL.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/04-pinchtab-tests/PHASE2-EXECUTION.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/04-pinchtab-tests/PHASE2-EXTENDED.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/04-pinchtab-tests/PINCHTAB-ACCESS.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/04-pinchtab-tests/SKILL.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/05-bugfix-agents-pipelines/SKILL.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/agents/agy/README.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ai-memory-sync.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/API-REFERENCE.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/appwrite-migration-research.md` | MADR-кандидат | 0001 | Appwrite/BaaS choice покрито ADR-0001; Function IDs потребують перевірки services. | оновити |
| `docs/ARCHITECTURE-CORE.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ARCHITECTURE-SAAS.md` | MADR-кандидат | 0001, 0002 | Appwrite + Worker choice описано поза canonical ADR; endpoint/env facts потребують перевірки. | оновити |
| `docs/architecture/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/architecture/01_langgraph_for_beginners.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/architecture/02_drakon_to_langgraph_mapping.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/architecture/03_live_tracing_protocol.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/architecture/04_validation_and_errors.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/architecture/05_security_and_deployment.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/architecture/06_semantic_knowledge_graph.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/architecture/agents-overview.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/brownfield-migration-guide.md` | Reference | — | Процедурний/agent guide; code contradiction не виявлено. `CLAUDE.md`/`GEMINI.md` дублюють `AGENTS.md`. | залишити як є |
| `docs/COLLABORATION.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/concept/01-vision.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/02-drakon-primer.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/03-architecture.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/04-pipelines.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/05-human-agent-loop.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/06-knowledge-base.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/07-agent-dev-workflow.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/08-agent-docs-integration.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/concept/README.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/contracts/phase0-master-contracts.md` | Reference | — | Рядки 150–152 фіксують proxy на FastAPI `:8766`; current Worker також має Appwrite async paths. | оновити |
| `docs/CONTRIBUTING.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/DEPLOYMENT.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/DESIGN.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/for-agents/agent-fleet.md` | Застарілий | 0004, 0005 | Рядок 25 називає checkout `~/workspace` застарілим; порти 8765–8767 не знайдені в поточному `src/`/Worker. | оновити або архівувати |
| `docs/for-agents/debt-and-promotion-policy.md` | MADR-кандидат | 0008 | Policy дублюється ADR-0008; procedure і decision треба розвести. | оновити |
| `docs/for-agents/sdd-development-methodology.md` | Reference | — | Процедурний/agent guide; code contradiction не виявлено. `CLAUDE.md`/`GEMINI.md` дублюють `AGENTS.md`. | залишити як є |
| `docs/handoff/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/handoff/2026-08-18-astryx-shell-foundation.md` | MADR-кандидат | 0009 | Astryx рішення вже покрито ADR-0009; handoff не canonical source. | лишити як handoff або скоротити |
| `docs/handoff/2026-08-18-sdd-adr-integration-research.md` | MADR-кандидат | 0001–0009 | Посилання на відсутній `MASTER-CONTEXT.md`; прогнозує 4 ADR, фактично існують 0001–0009. | оновити як ADR index/source map |
| `docs/handoff/2026-08-18-ui-ux-adaptation-research.md` | Застарілий | 0006, 0007 | Рядки 25–26 фіксують drift між `src/routeTree.gen.ts` і `.lovable/src/routeTree.gen.ts`; стан не виправлено. | оновити після вирівнювання trees |
| `docs/handoff/archive/MASTER-CONTEXT-2026-06-30.md` | Застарілий | 0001–0005 | Архів стверджує працездатність FastAPI/MemPalace, не підтверджену current checkout. | залишити в archive або видалити |
| `docs/handoff/project-context-hub.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/handoff/sharon-uav-handoff.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/kb/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/kb/01-drakon-ir-spec.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/kb/02-agent-prompts.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/kb/sync-hooks-methodology.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/kb/zettelkasten-mempalace-principles.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/krytyka.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/manuals/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/manuals/manual-agent-studio.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/manuals/manual-mcp-access.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/manuals/manual-pipeline-a.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/manuals/manual-pipeline-b.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/manuals/manual-testing-uav-watcher.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/META/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/META/STANDARD.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ONBOARDING.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/opendesign-mobile-integration.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/plans/2026-05-12-drakon-agent.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-12-multi-agent-drakon-system.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-12-platform-redesign-proposal.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-15-langgraph-pipeline.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-16-js-ts-support.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-16-pipeline-ui.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-16-sprint5-pipeline-mgmt.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-21-drakon-langgraph-runtime.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-21-ir-scheme-bidirectional-import.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-22-pipeline-scenarios.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-22-platform-redesign.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-26-pinchtab-test-plan.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-29-unified-agent-framework-v2.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-29-unified-agent-framework.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-05-29-variant-a-single-github-config.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0013; reference частину лишити окремо |
| `docs/plans/2026-05-30-ai-drakon-issues-from-uav-analysis.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/plans/2026-05-30-mempalace-first-methodology.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `docs/plans/2026-05-30-uav-watcher-ai-refactoring.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/plans/2026-05-31-sonate-solidaire-master-plan.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/plans/2026-05-31-uav-watcher-analysis.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/plans/2026-05-31-uav-watcher-sprint2.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/plans/2026-06-16-semantic-knowledge-graph-docs-agent.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/2026-06-16-semantic-knowledge-graph-TASKS.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `docs/plans/contacts_vaud_institutions.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/plans/Multi-Agent DRAKON System Plan.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/plans/pinchtab-test-results-extended-2026-05-26.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/reports/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/reports/agent-architecture-2026-05-29.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/reports/audit-2026-05-29.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/reports/bug_catalog.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/reports/code-analysis-2026-05-29.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/reports/context-search-research-2026-05-29.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/reports/demo-sharon-uav-2026-05-29.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/reports/docs-audit-2026-05-31.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/reports/sync-update-2026-05-29.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/screenshot/agy-task-ui-bug-sprint.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/sonate-solidaire/SS-06-zvit-UA.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/templates/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/templates/lovable-migration/lovable-prompts/00-handoff.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/templates/lovable-migration/lovable-prompts/00-project-init.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/templates/lovable-migration/lovable-prompts/00-safe-migration-init.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/templates/lovable-migration/README.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/TROUBLESHOOTING.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/uav-watcher-analysis/ai-drakon-ui-report.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/architecture.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/components.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/data-flow.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/issues.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/problem-map.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/sprint1-report.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/sprint2-task107.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher-analysis/task101-pipeline-refactoring.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/uav-watcher/auth.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/uav-watcher/consultant.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/uav-watcher/geo_monitor.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/uav-watcher/shelter_search.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/uav-watcher/threat-detection-analysis.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `docs/uav-watcher/uav_watcher.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/uav-watcher/web_config.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ui-pages-reference.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ux-audit/_INDEX.md` | Reference | — | Index/meta-navigation; частина links веде до empty placeholders або historical docs. | оновити |
| `docs/ux-audit/audit.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ux-audit/lovable-prompt-27.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ux-audit/risks.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ux-audit/stitch-prompt-agent-studio.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ux-audit/stitch-prompt-pipeline-panels.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/ux-audit/stitch-prompt.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `docs/wiki/01_project_overview.md` | Reference | 0001, 0002, 0006, 0007, 0009 | Загальні facts відповідають коду; бракує canonical ADR links і note про route drift. | оновити |
| `docs/wiki/02_architecture_flows.md` | Reference | 0001, 0002, 0006, 0007, 0009 | Загальні facts відповідають коду; бракує canonical ADR links і note про route drift. | оновити |
| `docs/wiki/03_api_reference.md` | Reference | — | API snapshot; current code містить codegen і semantic-graph async polling, повнота не підтверджена. | оновити |
| `docs/wiki/04_data_models.md` | Reference | 0009 | Довідник; Astryx components існують, але legacy classes ще присутні. | оновити |
| `docs/wiki/05_component_catalog.md` | Reference | 0009 | Довідник; Astryx components існують, але legacy classes ще присутні. | оновити |
| `docs/wiki/06_deployment_ci_cd.md` | Застарілий | 0006, 0007 | Рядок 40 посилається на `feature/astryx-ui`; checkout — `main`. | оновити |
| `GEMINI.md` | Reference | — | Процедурний/agent guide; code contradiction не виявлено. `CLAUDE.md`/`GEMINI.md` дублюють `AGENTS.md`. | залишити як є |
| `HANDOFF.md` | Застарілий | 0002 | Посилання на відсутні `MASTER-CONTEXT.md`, `GEMINI_AGENT_PROMPTS.md`, `mcp_config.json`; описує старий тестовий handoff. | видалити |
| `import/architecture/architecture-reference.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `import/drakonred/INSTALL_LOVABLE.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `import/garden-bloom/README.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `import/stitch_agent_logic_studio/drakon_logic_system/DESIGN.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `import/stitch_ai_drakon_codegen_ui_refinement/ai_drakon_ide/DESIGN.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `import/stitch_ai_drakon_pipeline_panels/kinetic_logic/DESIGN.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `import/stitch_ai_drakon_workspace_shell/ai_drakon_project_summary.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `import/stitch_ai_drakon_workspace_shell/precision_dark_ide/DESIGN.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `import/stitch_ai_drakon_workspace_shell/precision_dark/DESIGN.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `infrastructure/cloudflare-resources.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/00-handoff.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/00-project-init.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/00-safe-migration-init.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/00-stitch-lovable-template.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/01-design-system-precision-dark.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/02-diagrams-page-mission-control.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/03-validation-panel-mutation-log.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/04-editor-canvas-height.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/05-diagrams-page-card-safe-delete.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/06-github-files-error-mobile.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/07-editor-canvas-height-v2.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/08-github-files-mobile-layout.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/09-settings-cleanup.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/10-minio-tab.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/11-agent-chat-panel.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/11-project-folder-drn.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/12-repo-selector.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/13-agent-chat-ux.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/14-agents-settings.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/23-full-graph.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/24-files-tab-rename.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/25-editor-improvements.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/26-import-guide.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/28-agent-logic-studio.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/29-agent-logic-studio-optimized.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/30-sse-streaming.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/31-sprint2-monaco-history.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/32-ui-polish-codegen.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/33-stitch-codegen-implementation.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/34-agents-nav-link.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/35-workspaceshell-nav-fixes.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/36-command-palette.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/37-agent-studio-mobile.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/38-save-to-kb.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/40-pipeline-editor.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/41-pipeline-visual-editor.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/42-project-selector-dev-cycle.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/43-project-manager-github-integration.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/43-project-manager.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/44-github-project-binding-fix.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/45-devcycle-context-command-center.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/53-agent-cli-interface.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/54-agent-cli-streaming.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/55-mobile-layout-cli-agents-refactor.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/56-verify-task-drk-11.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/56-verify-tasks-1-to-11.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/done-46-claude-chat-codeproxy.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/done-47-ux-sidebar-collapse-diagram-edit.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/done-48-autonomous-ux-analysis.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/done-49-ir-scheme-bidirectional-import.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `lovable-prompts/done-50-activeproject-docs-notes-edit-ir.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/done-51-diagrams-direct-editor-ir-inline.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/done-52-ux-autonomous-research.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `lovable-prompts/gemini-deep-research-redesign.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `open-design-plugin/SKILL.md` | Застарілий | — | Файл містить лише `-` або `#`; зміст відсутній. | видалити |
| `README.md` | Reference | — | Процедурний/agent guide; code contradiction не виявлено. `CLAUDE.md`/`GEMINI.md` дублюють `AGENTS.md`. | залишити як є |
| `scripts/codetomd/README.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/kb/00-drakon-rules.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/kb/sonate-solidaire/kb-events.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/kb/sonate-solidaire/kb-general.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/kb/sonate-solidaire/kb-musicians.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/kb/sonate-solidaire/kb-partners.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/knowledge/00-architect-role.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/architect-agent/knowledge/01-api-endpoints.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/crisis-bot/docs/plans/2026-05-17-crisis-bot-langgraph.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0011; reference частину лишити окремо |
| `services/crisis-bot/docs/plans/SESSION_STATE_crisis_bot.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/crisis-bot/knowledge/00-crisis-base.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/docs-agent/knowledge/00-docs-role.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/docs-agent/knowledge/01-project-glossary.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/docs/architecture.md` | MADR-кандидат | — | Описує architectural approach/choice; відповідного ADR 0001–0009 немає. Current evidence: LangGraph у `services/architect-agent`, semantic graph у `services/semantic-graph`, DRAKON IR у `services/drakon-agent`. | новий новий ADR-0010; reference частину лишити окремо |
| `services/drakon-agent/knowledge/00-drakon-rules.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/01-diagram-types.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/02-icon-semantics.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/03-content-labeling.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/04-ast-mapping.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/05-rightward-degradation.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/06-validation-metrics.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/07-code-patterns.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/08-bm25-index.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/knowledge/drakon-ir-format.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `services/drakon-agent/README.md` | Reference | — | Prompt, plan, report або domain knowledge; стабільного architectural decision не фіксує. | лишити як є |
| `TASKS.md` | Застарілий | — | Старі задачі мають `[x]`, але містять `In progress`; не відображає current code state. | архівувати |

## Методика та межі

MADR-кандидат = рішення з альтернативами, довгим впливом або новими інваріантами. Reference не конвертувати в ADR. Empty `-`/ `#` files = stale placeholders. Повну code-claim перевірку повторити через GitNexus `query()`/ `context()` після відновлення MCP transport.

---
title: "AI-DRAKON — Покажчик документації"
type: reference
tags: [index, docs]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# AI-DRAKON — Покажчик документації

> DQL: `TABLE title, type, status FROM "docs" WHERE file.name != "INDEX" SORT type ASC`

---

## Концепція та огляд (`type: concept`)

| Документ | Шлях | Статус |
|----------|------|--------|
| 01 — Концепція AI-DRAKON | `concept/01-vision.md` | active |
| 02 — Мова DRAKON: основи для розробника | `concept/02-drakon-primer.md` | active |
| 03 — Архітектура системи | `concept/03-architecture.md` | active |
| 04 — Пайплайни: Pipeline A та Pipeline B | `concept/04-pipelines.md` | active |
| 05 — Human-Agent Loop: модель взаємодії людини та агента | `concept/05-human-agent-loop.md` | active |
| 06 — База знань предметної області | `concept/06-knowledge-base.md` | active |
| Agent Development Workflow | `concept/07-agent-dev-workflow.md` | active |
| 08 — Агенти та markdown-база знань: повна інтеграція | `concept/08-agent-docs-integration.md` | active |
| AI-DRAKON: Документація системи | `concept/README.md` | active |

## Архітектурні гайди (`type: architecture`)

| Документ | Шлях | Статус |
|----------|------|--------|
| Фаза 1: Вступ у LangGraph з нуля — Концептуальний посібник д | `architecture/01_langgraph_for_beginners.md` | active |
| Фаза 2: Міст між мовою ДРАКОН та ШІ — Мапінг концепцій у Lan | `architecture/02_drakon_to_langgraph_mapping.md` | active |
| Фаза 3: Протокол «Живого трасування» — Як схема оживає в UI | `architecture/03_live_tracing_protocol.md` | active |
| Фаза 4: Робота з помилками та геометрична валідація схем ДРА | `architecture/04_validation_and_errors.md` | active |
| Фаза 5: Безпека, Авторизація та Деплоймент системи | `architecture/05_security_and_deployment.md` | active |

## База знань для агентів (`type: kb`)

| Документ | Шлях | Статус |
|----------|------|--------|
| DRAKON IR — Повна база знань для агента (формалізована) | `kb/01-drakon-ir-spec.md` | active |
| Артефакт 2 — Agent Chat UI + System Prompts + Handoff | `kb/02-agent-prompts.md` | active |

## Довідники та аудит (`type: reference`)

| Документ | Шлях | Статус |
|----------|------|--------|
| UI Pages Reference — AI-DRAKON Platform | `ui-pages-reference.md` | active |
| AI-DRAKON UX Audit — 2026-05-15 | `ux-audit/audit.md` | active |
| Prompt 27: Pipeline UI — Code Analysis + Code Generation pan | `ux-audit/lovable-prompt-27.md` | active |
| Implementation Risks — Pipeline UI | `ux-audit/risks.md` | active |
| Stitch Design Prompt — Agent Logic Studio | `ux-audit/stitch-prompt-agent-studio.md` | active |
| Stitch Design Prompt — Pipeline Panels (CodeAnalysisPanel +  | `ux-audit/stitch-prompt-pipeline-panels.md` | active |
| stitch prompt | `ux-audit/stitch-prompt.md` | active |

## Плани імплементації (`type: plan`)

| Документ | Шлях | Статус |
|----------|------|--------|
| DRAKON Agent — Implementation Plan | `plans/2026-05-12-drakon-agent.md` | active |
| Multi-Agent DRAKON System — Implementation Plan | `plans/2026-05-12-multi-agent-drakon-system.md` | active |
| **Architectural Redesign and Implementation Strategy for the | `plans/2026-05-12-platform-redesign-proposal.md` | active |
| LangGraph Pipeline Implementation Plan | `plans/2026-05-15-langgraph-pipeline.md` | active |
| JS/TS Support in drakon-agent — Implementation Plan | `plans/2026-05-16-js-ts-support.md` | active |
| Pipeline UI Implementation Plan | `plans/2026-05-16-pipeline-ui.md` | active |
| Sprint 5 — Agent Pipeline Management System | `plans/2026-05-16-sprint5-pipeline-mgmt.md` | active |
| DRAKON-as-Runtime for LangGraph Pipelines — Implementation P | `plans/2026-05-21-drakon-langgraph-runtime.md` | active |
| DRAKON IR ↔ Scheme Bidirectional Import — Implementation Pla | `plans/2026-05-21-ir-scheme-bidirectional-import.md` | active |
| Pipeline Command Center — Документація сценаріїв | `plans/2026-05-22-pipeline-scenarios.md` | active |
| AI-DRAKON Platform Redesign — 2026-05-22 | `plans/2026-05-22-platform-redesign.md` | active |
| **Implementation and Architecture Report: Multi-Agent DRAKON | `plans/Multi-Agent DRAKON System Plan.md` | active |

## Шаблони та гайди (`type: guide`)

| Документ | Шлях | Статус |
|----------|------|--------|
| AGY Skills — AI-DRAKON Documentation Agent | `agents/agy/README.md` | active |
| AGY Bootstrap — Operational Alignment Skill | `agents/agy/00-bootstrap/SKILL.md` | active |
| AGY Documentation Agent — Skill | `agents/agy/01-docs-agent/SKILL.md` | active |
| AGY Repo Analyzer — Skill | `agents/agy/02-repo-analyzer/SKILL.md` | active |
| Lovable Account Migration | `templates/lovable-migration/README.md` | active |
| Lovable Handoff Context — AI-DRAKON | `templates/lovable-migration/lovable-prompts/00-handoff.md` | active |
| Lovable Init Prompt — AI-DRAKON | `templates/lovable-migration/lovable-prompts/00-project-init.md` | active |
| 00 safe migration init | `templates/lovable-migration/lovable-prompts/00-safe-migration-init.md` | active |
| AGY Skill 03 — Dataview DQL endpoint + REPO_ROOT fix | `agents/agy/03-dataview-dql/SKILL.md` | active |
| AGY Skill 04 — PinchTab Test Plan: Research Phase | `agents/agy/04-pinchtab-tests/SKILL.md` | active |

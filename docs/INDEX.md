# AI-DRAKON documentation index

Власник: Codex/оператор репозиторію. Оновлено: 2026-08-20.

## Архітектурні рішення

- [`docs/adr/`](adr/) — ADR-0001–0025 у форматі MADR; починай із [template](adr/template.md).
- [ADR-0006](adr/0006-lovable-mirror-sync-build-contract.md) — `src/` ↔ `.lovable/src/` build contract (superseded by ADR-0017 — `.lovable/` deleted in Phase 0).
- [ADR-0007](adr/0007-tanstack-start-routetree-contract.md) — TanStack route-tree parity.
- [ADR-0008](adr/0008-arbiter-promotion-policy.md) — arbiter shadow → blocking.
- [ADR-0009](adr/0009-astryx-canonical-design-system.md) — canonical Astryx UI layer.
- [ADR-0010](adr/0010-langgraph-agent-orchestration.md) — LangGraph orchestration.
- [ADR-0011](adr/0011-repository-semantic-graph.md) — GitHub-backed semantic links.
- [ADR-0012](adr/0012-bidirectional-drakon-ir.md) — bidirectional DRAKON IR.
- [ADR-0013](adr/0013-single-github-project-config.md) — single project config.
- [ADR-0014](adr/0014-pilot-project-vydra-swiss-survey.md) — vydra pilot.
- [ADR-0015](adr/0015-drakon-embedded-adr-documentation.md) — DRAKON diagrams embedded in ADRs.
- [ADR-0016](adr/0016-product-reframing-spec-driven-meta-harness-saas.md) — product reframe: spec-driven meta-harness SaaS.
- [ADR-0017](adr/0017-monorepo-with-workspace-tooling.md) — pnpm + Turborepo monorepo, `.lovable/` eliminated.
- [ADR-0018](adr/0018-appwrite-cloudflare-responsibility-split.md) — Appwrite vs Cloudflare responsibility split.
- [ADR-0019](adr/0019-mcp-exposure-model.md) — tenant-filtered MCP exposure model.
- [ADR-0020](adr/0020-policy-engine-design.md) — server-resident harness specs, extracted policy engine.
- [ADR-0021](adr/0021-knowledge-plane-design.md) — unified `KnowledgeProvider` interface.
- [ADR-0022](adr/0022-harness-adapter-abstraction.md) — `HarnessAdapter` executor abstraction.
- [ADR-0023](adr/0023-model-provider-routing-strategy.md) — model-router platform primitive.
- [ADR-0024](adr/0024-audit-and-trace-model.md) — audit log + run trace data model.
- [ADR-0025](adr/0025-tenancy-boundary.md) — tenant as the primary authorization boundary.

## Architecture

- [`docs/architecture/target-architecture.md`](architecture/target-architecture.md) — target architecture for the spec-driven meta-harness SaaS (bounded contexts, MCP strategy, HarnessAdapter contract), authorised by ADR-0016.
- [`docs/plans/ai-drakon-saas-architecture.md`](plans/ai-drakon-saas-architecture.md) — full repository-grounded architecture analysis and phased migration plan (10 outputs) this ADR set and target architecture are drawn from.

## Agent operations

- [`docs/for-agents/`](for-agents/) — SDD methodology, fleet guide, debt policy and migration guidance.
- [`docs/handoff/`](handoff/) — dated research and operational handoffs.

## Specifications

- [`specs/000-baseline/`](../specs/000-baseline/) — frontend codegen and build baseline.
- [`specs/001-backend-agents-baseline/`](../specs/001-backend-agents-baseline/) — three FastAPI services baseline.
- [`specs/002-methodology-and-astryx-refactor/`](../specs/002-methodology-and-astryx-refactor/) — current methodology/Astryx plan.

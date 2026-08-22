---
status: proposed
date: 2026-08-20
deciders: Q, platform architecture
spec: specs/005-product-reframing/plan.md
supersedes:
superseded-by:
---

# 0016. Reframe ai-drakon-scaffolder as a spec-driven meta-harness SaaS

## Context

The repository contains four distinct things: a DRAKON visual-programming IDE, a
multi-agent execution substrate (15 service directories), a 4730-line Cloudflare
Worker integration monolith, and material belonging to unrelated products
(crisis-bot, sonate-solidaire, uav-watcher). It has no stated product boundary,
and no single end-to-end workflow that the specification, ADR, and diagram
infrastructure feeds into.

At the same time the codebase has already, without naming it, built the two
primitives a governed agent platform needs: `src/lib/harness/harness-spec.ts`
defines a complete policy contract (allowed tools, quotas, and four gates
including `require_human_approval` on commits), and `src/lib/htse/` defines a
validated task-graph format (DRAKON IR).

## Decision

We reframe the project as a spec-driven meta-harness SaaS: a platform that turns
specifications, architecture rules, knowledge assets, and policy logic into
governed multi-agent software delivery workflows.

The organising invariant is: **the harness spec is server-resident, tenant-owned
and versioned; clients reference it by id and may never supply it.**

The first end-to-end workflow ("Spec-to-PR Loop v0") is: ADR + spec plan →
task graph (DRAKON IR) → policy-gated execution → persisted trace →
human-approved commit → PR → ADR status transition. All other work is
subordinate to shipping that loop.

## Consequences

Positive: gives every existing subsystem a purpose in a single narrative;
converts private tooling into sellable primitives; makes the ADR system
load-bearing rather than decorative.

Negative: crisis-bot, sonate-solidaire and uav-watcher must leave the
repository; the DRAKON IDE becomes a feature of the platform rather than the
product; several experiments must be abandoned.

Neutral: no code changes on acceptance. This ADR authorises 0017–0025.

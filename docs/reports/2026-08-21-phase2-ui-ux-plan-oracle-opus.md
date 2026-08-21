# Phase 2 UI/UX Implementation Plan — Architecture Visibility

**Date:** 2026-08-21
**Source:** parallel research-only session, Opus on Oracle Cloud VM (edgee), branch `phase0-stabilize` @ `bb8cde19`
**Scope:** planning only — no code edits, no commits, produced independently of Slice 4 engineering work
**Session record:** https://www.edgee.ai/~/maxfraieho/sessions/0a22a202-203a-4e6b-a6cf-b998035cf079

This plan was commissioned in parallel with Phase 2 Slice 4 (IR validator boundary reconciliation) to answer a separate question: how should the Phase 2 architectural changes (`packages/harness-contract`, `packages/policy-engine`, the canonical-vs-worker validator split) become visible in the app's Astryx-based frontend. It is planning-only and independent of the Slice 4 implementation delivered in `docs/reports/2026-08-21-phase2-slice4-ir-validator-reconciliation.md`.

Evidence gathered independently confirms the same three-validator split found in Slice 4's own inventory, plus one additional flavor not covered by Slice 4's scope: `services/drakon-agent-flue/lib/ir-validator.ts`, which returns a fourth, differently-shaped result (`{valid, errors[], warnings[]}`). Worth accounting for in any future slice touching that service.

---

# UI/UX Implementation Plan — Phase 2 Architecture Visibility (post-Slice-3)

## 1. UI Goals

The Phase 2 boundary extractions (`harness-contract`, `policy-engine`) and the upcoming Slice 4 validator reconciliation are currently invisible in the interface. They exist only as package folders and worker code. This plan makes that architectural state legible to the people who need it, while keeping the default end-user experience unchanged.

The UI should solve these concrete problems:

1. **"Which validator ran, and can I trust its verdict?"** Today a user sees IR validation results with no indication of whether they came from the canonical in-browser validator (`ir-validator-core.ts`) or the remote Cloudflare Worker (`validateIrDeterministic`). When the two disagree — the exact risk Slice 4 addresses — the user has no signal.

2. **"Is the result authoritative or provisional?"** There is no way to distinguish a canonical validation (deterministic, versioned, shared logic) from a runtime/worker validation (may lag the canonical logic, may adapt shapes).

3. **"What is the real boundary structure of this system?"** Developers and advanced operators cannot see that gate logic now lives in `policy-engine`, that types live in `harness-contract`, and that IR validation is mid-reconciliation. This matters for debugging gate verdicts and validation mismatches.

4. **"Where did this piece of evidence come from?"** The project distinguishes GitNexus-indexed knowledge from direct-read/runtime-only data. That provenance is currently unlabeled in the UI, so users cannot judge staleness or authority.

5. **"Is the running system consistent with the canonical definitions?"** Operators need a low-friction way to see drift between canonical logic and what the worker actually executes, without reading source.

Non-goal for the goals section: these surfaces must **not** turn the app into a developer console for normal users. Everything advanced is behind progressive disclosure (§8).

## 2. Recommended Surfaces

Five surfaces, ordered by audience breadth (widest first):

1. **Validator provenance drawer** (all users, contextual). A right-side Astryx drawer attached to any IR validation result. Shows which validator produced the verdict (canonical vs worker), a compatibility badge, and — when they differ — a diff summary. This is the primary Slice-4-visibility surface.

2. **Pipeline execution details — provenance column** (operators). Extend the existing execution/trace surfaces (`/trace`, `/pipelines`, `PipelineDrakonView`) so each gate verdict and validation event carries a provenance chip: which package/engine emitted it (`policy-engine`, worker inline, canonical).

3. **Architecture & Runtime Boundaries page** (advanced operators + developers). A new `system`-section route that renders the package/boundary map: `harness-contract`, `policy-engine`, `drakon-ir` (placeholder), and the canonical-vs-worker validator split. Read-only, evidence-backed.

4. **Workspace diagnostics panel** (operators). A panel inside the existing Workspace shell that shows live consistency status: is the worker validator behavior-compatible with canonical? Is the harness spec shape matching `harness-contract`? Surfaces warnings, not internals.

5. **Developer-only status page** (developers). Deepest surface. Raw package versions, validator shape adapters, GitNexus index freshness, and the known preserved gaps (e.g. `require_human_approval` unread, skipped-gate `allowed:true` quirk) documented directly from the package doc-comments. Hidden unless a developer/debug flag is on.

## 3. Information Architecture

| Surface | Audience | Purpose | Must show | Should not show |
|---|---|---|---|---|
| Validator provenance drawer | All users (contextual) | Tell user which validator ran and whether its verdict is trustworthy | Validator source (canonical / worker), compatibility badge, issue list with `code`+`severity`, "differs from canonical" warning when applicable | Raw normalize algorithm, worker internals, package versions |
| Pipeline execution provenance | Operators | Attribute each gate verdict / validation event to its engine | Per-event provenance chip (`policy-engine` / worker / canonical), gate name, allowed/blocked, reason | Source code, `Math.random`-driven internals, full spec JSON |
| Architecture & Runtime Boundaries page | Advanced operators, developers | Explain the package/boundary layout and the canonical↔worker split | Boundary map (harness-contract, policy-engine, drakon-ir placeholder), validator reconciliation status, evidence provenance labels | Editable config, live mutation controls, secrets/endpoints |
| Workspace diagnostics panel | Operators | Live consistency/drift health at a glance | Compatibility status (OK / adapted / divergent), harness-spec shape match, last-checked timestamp + provenance | Full type definitions, stack traces, package source |
| Developer-only status page | Developers | Deep boundary + provenance forensics | Package names/versions, validator shape adapters, known preserved gaps, GitNexus index freshness, direct-read vs indexed labels | Anything that implies these are user-editable; must stay read-only |

## 4. Astryx Implementation Guidance

**Shell / layout.** All new full-page surfaces render inside `WorkspaceShell` (which already composes `AstryxHeader` + `AstryxSideNav`), matching every migrated page. The Architecture & Runtime Boundaries page and Developer status page are new routes registered in `ASTRYX_NAV_ITEMS` (`astryx-nav-config.ts`) under `section: "system"` with `headerVisible: false` (keep them out of the top header, reachable via side nav only — same treatment as `settings`, `sync`, `trace`). The provenance drawer and diagnostics panel are **not** routes; they mount inside existing surfaces.

**Component classes / categories to prefer.** Follow the `trace.tsx` template exactly:
- Page frame: `flex flex-col h-full bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)]`.
- Header band: `h-14 border-b border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)]` with an icon tile `bg-[var(--astryx-color-brand-light)]` + `text-[var(--astryx-color-brand)]`.
- Cards: `rounded-xl border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)]` with `data-variant="card"`.
- Buttons/CTAs: `astryx-button` with variant (`primary`/`ghost`) and size (`sm`/`md`) classes, plus matching `data-variant`/`data-size`.
- Badges: `astryx-badge` with `primary`/`success` (and reuse the same class family for `warning`/`danger` states needed by the validator drawer — do not invent a parallel badge system).
- Drawer/panel: reuse the existing `Sheet` primitive already imported by `WorkspaceShell` (`@/components/ui/sheet`) for the provenance drawer, so it inherits shell styling.

**Token usage.** Use only the confirmed Astryx CSS variables — surfaces (`--astryx-surface-page/primary/secondary/elevated`), text (`--astryx-text-primary/secondary/muted`), borders (`--astryx-border-subtle/focus`), brand (`--astryx-color-brand/-hover/-light/-on-brand`), radii, shadows, and `--astryx-font-mono`/`--astryx-font-sans`. Do **not** introduce raw hex or new color tokens. For status semantics (compatible / adapted / divergent) map to the existing brand/success tokens plus the badge family; add new tokens only if a genuinely new semantic color is unavoidable, and if so define them in `astryx.css` alongside the existing set — never inline.

**Semantic selectors.** Every new component carries `data-testid`, and interactive/stateful elements carry `data-variant` and `data-size`, per the migrated-page convention (agent-readiness). Suggested testids: `validator-provenance-drawer`, `validator-compat-badge`, `boundaries-page`, `boundary-card-policy-engine`, `boundary-card-harness-contract`, `provenance-chip`, `diagnostics-panel`, `dev-status-page`.

**Dark mode / theming.** Because everything is token-driven, dark mode works automatically via the existing `useTheme` light/dark switch and `[data-astryx-theme]` scoping. Do not hard-code light or dark colors. Verify the new status colors (compat badges, warning chips) read correctly in both themes — that is the only theming-specific check needed.

**Consistency with existing migrated pages.** Mono, uppercase, tracked page titles (`font-mono text-sm uppercase tracking-wider`); muted subtitle line; Ukrainian primary labels matching `astryx-nav-config.ts` (with English technical terms kept verbatim, e.g. "policy-engine", "canonical validator"). Empty/unavailable states follow the `trace.tsx` centered-card pattern rather than blank regions.

## 5. Route and Component Strategy

| Proposed route/component | Reuse existing route? | New component? | Why here? |
|---|---|---|---|
| `ValidatorProvenanceDrawer` | No route — mounts in HTSE/IR views (`components/htse`, editor, `PipelineDrakonView`) | New component (wraps existing `Sheet`) | Provenance is contextual to a specific validation result; belongs beside where validation is triggered, not on its own page |
| Provenance chips in execution/trace | Reuse `/trace`, `/pipelines`, `PipelineDrakonView` | New small `ProvenanceChip` component | Execution surfaces already exist and already render gate verdicts; attribution is an additive column, not a new page |
| `/system/boundaries` (Architecture & Runtime Boundaries) | New route, rendered inside `WorkspaceShell` | New `BoundariesPage` + `BoundaryCard` | No existing surface explains package/boundary layout; needs its own space; `system` section keeps it out of end-user flow |
| `WorkspaceDiagnosticsPanel` | Reuse Workspace shell (mount alongside `DevCyclePanel`/`AgentStatusBar`) | New panel component | Diagnostics is a live-health widget for operators already in the workspace; matches existing panel pattern in `components/workspace` |
| `/system/dev-status` (developer status) | New route inside `WorkspaceShell`, gated by debug flag | New `DevStatusPage` | Deepest forensic view; must be separable and hideable; not appropriate to bolt onto a user page |
| `ASTRYX_NAV_ITEMS` entries | Edit existing `astryx-nav-config.ts` | Config additions only | Both new routes need side-nav entries under `system`, `headerVisible: false` |

Route naming note: `p.$slug.*` is the project-scoped pattern and `system` surfaces are global. Place boundaries/dev-status as top-level (`/system/...` or flat like existing `/trace`, `/sync`) — they describe the app's architecture, not a single project.

## 6. Validator-Reconciliation UI

This is the core Slice-4-facing surface. The UI must express four things without exposing algorithm internals:

**Canonical validator.** Result from `ir-validator-core.ts` (in-browser, deterministic, shared logic). Present as the authoritative baseline. Label: "Canonical" with a `success`/brand badge. Its rich shape (`issues[]` with `code`/`severity`/`nodeId`/`autofix`, plus `autofixes[]`) is the display schema the drawer renders.

**Worker validator.** Result from `validateIrDeterministic` in `worker-mcp-drakon.js` via `validateIrRemote` (`POST /v1/drakon/validate-ir`). Present as the runtime verdict — what actually executes in production. Label: "Worker / runtime".

**Compatibility / adaptation status.** A single badge with three states:
- **Compatible** (`success`): worker verdict matches canonical (`valid` agrees, issue set equivalent).
- **Adapted** (`primary`/neutral): worker returned a different *shape* that the client normalized to the rich schema, but the verdict is equivalent. This is expected during Slice 4 — the client bridge already expects the rich shape while the worker/service flavors differ (`services/drakon-agent-flue/lib/ir-validator.ts` returns `{valid, errors[], warnings[]}`).
- **Divergent** (`warning`/`danger`): worker and canonical disagree on `valid` or on error-level issues. This is the case the UI must make loud.

**Warnings when behavior differs.** On `Divergent`, the provenance drawer surfaces a top banner ("Runtime verdict differs from canonical") and a compact per-issue diff: issues present in canonical but missing from worker, and vice versa, keyed by `code`/`nodeId`. Do not attempt to auto-resolve — the UI reports, the Slice-4 engineering work reconciles. This gives the reconciliation effort a visible target and a regression check.

**Provenance of evidence.** Each side of the comparison is labeled with how it was obtained: canonical = "direct-read (in-app logic)"; worker = "runtime (remote worker call, live)". If any structural claim on the Boundaries page is backed by GitNexus, it carries an "indexed" provenance tag with index-freshness; runtime call results carry a "runtime-only, live" tag. Never render an indexed claim as if it were live runtime state, or vice versa.

Data source for the comparison: run both `ir-validator-core` locally and `validateIrRemote` for the same IR, then diff the two `ValidationResult`s client-side. No backend change required to *display* this — it reuses both existing validators. (Actual reconciliation of their logic is Slice 4 engineering, out of scope here.)

## 7. Boundary-Visibility UI

The Boundaries page renders one `BoundaryCard` per architectural unit, each read-only and evidence-backed:

- **`packages/harness-contract`** — "Shared contract (types only)". Card shows: purpose (canonical `DrakonHarnessSpec`, `GateVerdict`, `PipelineEvent` types), a note that it holds no runtime logic, and the documented preserved gaps pulled from its doc-comment (`require_human_approval` and several spec fields declared-but-unread). Consumers: `policy-engine`, deterministic-engine.

- **`packages/policy-engine`** — "4-Gate evaluation logic". Card shows: gate order `safety → policy → confidence → cost`, that it is a bit-for-bit behavior extraction (not a redesign), and the preserved quirks (skipped gate → `allowed:true` with no reason; no `Math.random` inside the package). Marks its dependency on `harness-contract`.

- **`packages/drakon-ir`** — "IR boundary (planned)". Card shows placeholder/empty state (the source is literally `export {}` today) with a "Not yet populated — target of upcoming IR work" note, referencing that Slice 4 reconciliation feeds this boundary. Use the centered empty-card pattern from `trace.tsx`.

- **Validator split** — a dedicated card pairing canonical (`ir-validator-core.ts`) and worker (`worker-mcp-drakon.js`) with the current compatibility status and a link that opens the provenance drawer on a sample/last IR.

**Avoiding overwhelm for normal users.** The entire Boundaries page lives under the `system` nav section with `headerVisible: false`, so it never appears in the primary header nav or default end-user flow. Normal users reach validator provenance only through the contextual drawer, and that drawer defaults to a single compatibility badge — the package/boundary detail is collapsed behind a "Details" expander. Package names, quirks, and the diff view appear only on explicit expansion or on the system pages. No boundary jargon leaks into the default IR/editor experience.

## 8. Progressive Disclosure

**Default end-user experience.** Sees only: a validation result and a single compatibility badge on that result. Green/`success` badge → nothing more to do. A `warning` badge is the only escalation they see, with a one-line plain-language message and an optional "Details" affordance. No package names, no engine names, no diffs by default. Nav shows no new items in the header.

**Advanced operator experience.** Opens the provenance drawer's "Details" to see canonical vs worker attribution, the issue diff, and the compatibility rationale. Has the Workspace diagnostics panel and can reach `/system/boundaries` via side nav. Sees provenance chips on execution/trace. Sees indexed-vs-runtime provenance tags. Does not see raw source, versions, or the preserved-gap forensics.

**Developer experience.** Everything above plus `/system/dev-status` (behind a debug/developer flag): package versions, validator shape adapters, the documented preserved gaps verbatim, GitNexus index freshness, and direct-read vs indexed labeling per claim. This is the only surface that names internal quirks like the `Math.random` boundary or the unread `require_human_approval` field.

Gating mechanism: reuse the existing settings/flag pattern (there is a `settings` route and `settings-storage`) rather than inventing a new toggle system. The developer surfaces read a single "developer mode" flag.

## 9. Suggested Implementation Order

Low-risk, additive sequence aligned to the backend slices. Each step ships independently and touches no engine logic.

1. **`ProvenanceChip` + provenance tagging primitives.** Smallest, purely presentational. Introduce the chip component and the indexed/runtime/direct-read provenance vocabulary as reusable Astryx-styled pieces. No data wiring yet. Zero risk.

2. **Validator provenance drawer (display-only, canonical side first).** Mount the drawer on existing IR/HTSE validation results showing just the canonical result in the rich `ValidationResult` schema. No worker call yet. Establishes the surface.

3. **Add worker side + compatibility badge.** Wire `validateIrRemote` alongside canonical, diff client-side, render the three-state compatibility badge and the divergence banner. This is the surface that makes Slice 4 measurable — build it *before or during* Slice 4 so reconciliation has a visible regression check.

4. **Execution/trace provenance column.** Add `ProvenanceChip` to `/trace`, `/pipelines`, and `PipelineDrakonView` gate verdicts, attributing to `policy-engine` / worker / canonical.

5. **Architecture & Runtime Boundaries page.** New `/system/boundaries` route + nav config entry. Static evidence-backed cards for `harness-contract`, `policy-engine`, `drakon-ir` placeholder, and the validator split. Pulls copy from package doc-comments.

6. **Workspace diagnostics panel.** Live compatibility/health widget in the shell, reusing the diff logic from step 3.

7. **Developer-only status page.** `/system/dev-status` gated by developer flag. Deepest forensics. Last because it is narrowest-audience and depends on the vocabulary from steps 1–6.

Rationale: steps 1–3 deliver the highest-value, Slice-4-aligned visibility with the least surface area; 5–7 are additive system pages that can slip without blocking anything.

## 10. Explicit Non-Goals

- **No new UI framework or redesign.** No MUI/shadcn-first/Chakra/Ant/Tailwind-from-scratch. Astryx tokens, shell, and component classes only. (Note: `WorkspaceShell` already imports some `@/components/ui/*` primitives like `Sheet` — reuse those as-is; this is not license to introduce a competing system.)
- **No editing of validator, gate, or engine logic.** These surfaces *display* canonical/worker/policy-engine behavior; they never mutate it. Slice 4 reconciliation itself is separate engineering work, not part of this UI pass.
- **No separate admin app.** Everything lives inside the existing app under the `system` nav section, gated by the existing settings flag.
- **No exposure of secrets, endpoints, or worker URLs** (`VITE_WORKER_URL`, auth tokens) in any surface, including the developer page.
- **No making architecture surfaces editable.** Boundaries and dev-status are strictly read-only. No "fix from UI" / "sync validators from UI" controls.
- **No route restructuring** of existing `p.$slug.*` project routes or the `routeTree.gen.ts` conventions beyond adding the two new leaf `system` routes and their nav entries.
- **No new color tokens or theming system.** Work within the confirmed Astryx variable set; add a token only if a genuinely new semantic is unavoidable, and only in `astryx.css`.
- **No backend/API changes required to ship §6.** The canonical-vs-worker diff uses the two validators that already exist. Do not design new endpoints for this pass.
- **No auto-resolution of validator divergence.** The UI reports drift; it does not pick a winner or auto-apply autofixes across the boundary.

---

Plan complete. Research-only, no edits, no commits. Deliverable fits current `WorkspaceShell`/Astryx/TanStack structure and the confirmed three-validator reality.


# Workforce UI — Consolidated Plan (de-duplicated)

## Corrections — 2026-08-29

1. [OPEN CONTRADICTION] Model A/B суперечність між §5/§11 плану і q6-tenant-visibility.drakon.json — НЕ вирішено, задокументовано.
2. [FIX] on-shift-work-cycle.drakon.json n18 — виправлено назви tools (workforce.synclogs / workforce.submitmicroadr).
3. [ADD] worker-onboarding.drakon.json n8 — додано TTL/expires_at до invite payload.
4. [ADD] Новий блокер (before P1): resolveTenant() hardcoded roles:['owner'].
5. [ADD] Рішення для review-audit колонок (Q10).
6. [CLOSE] Gate §8 — 5 діаграм закриті, з посиланням на коміти.
7. [ADD] Critical bug: Save diagram HTTP 500 (harness_specs.id UNIQUE constraint).
8. [ADD] High-priority defect: /agents порожній vs /pipelines.
9. [ADD] i18n P0 приклад: /architect, /notebooks.
10. [ADD] Термінологія (TERMINOLOGY_AUDIT.md таблиця або плейсхолдер).

## Re-verification log — 2026-08-29

Перевірено на живому checkout (dev-184, HEAD eda65238e, GitNexus індекс синхронний):

| # | Символ | Статус | Локація |
|---|---|---|---|
| 1 | AGENT_ALLOWED_TOOLS | VERIFIED — існує, рівно 8 ролей (architect, drakon, docs, sonate-solidaire, architect-a, architect-b, drakon-analyze, docs-chat) | packages/harness-contract/src/index.ts:108 |
| 2 | resolveMcpTenantAndSpec | VERIFIED — існує | cloudflare-worker/worker-mcp-drakon.js:2085 |
| 3 | resolveTenant() | CONFIRMED — досі `roles: ['owner']` апаратно, коментар в коді явно визнає відсутність membership-lookup ("out of scope for the initial tenant-of-one rollout") | packages/tenancy/src/index.ts:79 |
| 4 | git log 5 DRAKON-схем + план | ЗМІНИЛОСЬ — вже НЕ "0 commits". 2 реальні коміти: 56fe41cb ("docs(workforce-vision): add 4 DRAKON diagrams + plan copy under docs/plans/"), eda65238 ("docs(workforce-vision): add Pi Agent baseline test plan for current UI"). Усі 5 .drakon.json + WORKFORCE-UI-CONSOLIDATED-PLAN.md закомічені, 0 untracked. | git log --oneline -- docs/plans/org-workforce-vision-2026-08-24/ |
| 5 | GitNexus FTS/query() | ПРАЦЮЄ — live-перевірено прямими MCP-запитами. Розведення: "GitNexus Status: HTTP 404" у живому Settings UI аудиту стосується ІНШОГО — фронтенд перевіряє `fetch("/api/health")` (SettingsPage.tsx:379), не сам GitNexus MCP/FTS-сервер. Це різні речі. | src/pages/SettingsPage.tsx:374-390 (checkGitNexusHealth) |

## OPEN CONTRADICTION — Model A/B (Q6)

Виявлено пряму суперечність між текстом плану та схемою `diagrams/q6-tenant-visibility.drakon.json`:

- **Цитата з плану (§5 Q6 та §11):**
  > "Materialized-path `org_path` sub-groups inside one tenant; **repository-enforced**, not ad-hoc `LIKE` in route handlers" (§5 Q6)
  > "`org_path` as a string materialized path (`/root/workshop-3/assembly-b/`) is **not** an assumption: the alternative was considered and explicitly rejected with reasons — ADR-0026:161-171 raises nested tenants as option (b), 'a materially bigger change to the tenancy model than (a)', and SYNTHESIS-round2:103-105 rejects it because nested tenants 'would fracture ADR-0025's hard isolation guarantee and massively complicate billing aggregation.'" (§11)
- **Цитата зі схеми (`diagrams/q6-tenant-visibility.drakon.json`, вузол `end`):**
  > `"Decision gate: Choice between Model A and Model B remains open for Q. Packet P1 will implement the corresponding repository isolation test suite (prefix isolation vs multi-tenant delegation) once Q rules."`

**Статус:** НЕ вирішувати самостійно. Чекає письмового рішення Q.

---

**Status: GATED. NOT cleared for implementation. Do not start Packet 1 / Slice 5.1 code.**

**Date**: 2026-08-25 (consolidated 2026-08-25, verified and harmonized the same day; updated 2026-08-29)
**Author**: Claude — consolidation pass reconciling two overlapping planning artifacts
drafted independently on two other machines, followed by a live-code verification pass and
a harmonization pass.
**Governing ADR**: [`docs/adr/0026-organizational-ai-workforce-vision.md`](../adr/0026-organizational-ai-workforce-vision.md)
— Decision: **"Not yet made."**

Every factual claim in this document has been checked against the live checkout
(`main`, `eda65238`). What changed between the first consolidation and this
harmonized version is recorded in [§12, Verification & Corrections Log](#12-verification--corrections-log-2026-08-25)
and the 2026-08-29 Corrections log above.

## The gate (ADR-0026, restated — this is not re-litigated here)

ADR-0026 §"What would help detail this further" (`:121-143`) makes the architect-planning /
implementation pass conditional on DRAKON diagrams of the concrete user workflows existing
first. Q has confirmed that gate stands. This document is therefore a **merged specification
held in escrow**, not a work order.

| # | Diagram required by ADR-0026 | Status | Resolves |
|---|---|---|---|
| 1 | Worker onboarding / bootstrap | **DRAWN & COMMITTED** — [`diagrams/worker-onboarding.drakon.json`](diagrams/worker-onboarding.drakon.json) (commit `56fe41cb`) | Q1 |
| 2 | On-shift work cycle | **DRAWN & COMMITTED** — [`diagrams/on-shift-work-cycle.drakon.json`](diagrams/on-shift-work-cycle.drakon.json) (commit `56fe41cb`) | Q2, Q3 |
| 3 | KB authoring / promotion (supervisor side) | **DRAWN & COMMITTED** — [`diagrams/kb-authoring.drakon.json`](diagrams/kb-authoring.drakon.json) (commit `56fe41cb`) | Q2 (supervisor half) |
| 4 | Non-industrial example end-to-end (building management) | **DRAWN & COMMITTED** — [`diagrams/non-industrial-example.drakon.json`](diagrams/non-industrial-example.drakon.json) (commit `56fe41cb`) | Q4 |
| 5 | Q6 tenant hierarchy — who can see/act on whose data | **DRAWN & COMMITTED** — [`diagrams/q6-tenant-visibility.drakon.json`](diagrams/q6-tenant-visibility.drakon.json) (commit `56fe41cb`) | Q6 |

All 5 DRAKON diagrams have been drawn and committed to repository history (commits `56fe41cb` and `eda65238`).
However, as documented in `diagrams/q6-tenant-visibility.drakon.json` (node `end`), the architectural choice between
Model A (materialized path) and Model B (nested sub-tenants) remains an open decision gate awaiting Q's ruling.
Furthermore, implementation of P1 is blocked on resolving the hardcoded `roles: ['owner']` behavior in `resolveTenant()`
(see Re-verification log item 3).

---

## 1. Provenance — what was merged

| Source | Host / path | Lines | Tracked? |
|---|---|---|---|
| `WORKFORCE-UI-REDESIGN-PLAN.md` | `.184:/home/vokov/projects/…` **and** `.161:/home/vokov/workspace/…` | 168 | untracked on both |
| `WORKFORCE-UI-AND-SLICE5-PLAN.md` | `.184:/home/vokov/projects/…` **and** `.161:/home/vokov/workspace/…` | 128 | untracked on both |
| ADR-0026 | local `docs/adr/0026-…md` (committed, `ca7a2ffd`) | 210 | tracked |
| `SYNTHESIS-round2.md`, `VERIFICATION-round2.md`, `ADDENDUM-llm-verifier-workforce.md` | local, this folder | — | tracked |
| On-shift diagram | local, this folder | — | **untracked** |

**Both** remote plan files exist on **both** remote hosts and each pair is byte-identical
(verified by `diff` over `ssh cat`, exit 0). Details in §10.

Overlap between the two plans is high — both open with a near-identical "audit of the
existing UI" table and both propose the same five React components. This document keeps one
copy of each fact; where they diverge, the divergence is called out, not averaged.

---

## 2. Grounding facts — verified against the live checkout (2026-08-25)

Chesterton's Fence check. **Nothing named below exists yet** — no prior attempt to resurrect
or avoid duplicating:

- `src/components/workforce/` — **does not exist**
- `src/store/useWorkforceStore.ts` — **does not exist** (store dir has only
  `useAgentChatStore.ts`, `useCliChatStore.ts`, `useDiagramStore.ts`)
- `src/types/workforce.ts` — **does not exist**
- `src/routes/workforce/` — **does not exist**
- grep for `workforce|org_path|roster` across `src/**/*.{ts,tsx}` → zero real hits
  (the `shift` hits are `shiftKey` keyboard handlers)

Existing conventions the plans must obey (these are the source of §6's corrections):

| Fact | Evidence |
|---|---|
| `packages/tenancy/src/repositories.ts` is a **flat file** holding all 7 repository classes (`BillingProfileRepository`…`McpToolAuditRepository:327`, `HarnessSpecRepository:258-313`). The established pattern is **constructor-bound scoping**: each class holds `db` + `tenantId` as constructor-bound properties | direct read; `context({name:"HarnessSpecRepository"})` |
| `infrastructure/d1/migrations/` contains exactly `001-mcp-tool-audit.sql` → next is `002-` | direct listing |
| `src/routes/` has **zero subdirectories** — TanStack flat dotted filenames (`p.$slug.agents.index.tsx`) | `find src/routes -type d` |
| MCP tool names are lowercase-concatenated: `drakon.listdiagrams`, `drakon.getanalysissummary`, `docs.backlinks` — **no underscores anywhere** | `worker-mcp-drakon.js:1676+` |
| `AGENT_ALLOWED_TOOLS` has 8 roles: `architect`, `drakon`, `docs`, `sonate-solidaire`, `architect-a`, `architect-b`, `drakon-analyze`, `docs-chat` — **no worker/supervisor role** | `packages/harness-contract/src/index.ts:108` |
| That role table is **duplicated** (twice, not more): declared at `packages/harness-contract/src/index.ts:108` **and** independently at `scripts/seed-harness-specs.mjs:34`, with identical contents. `scripts/seed-harness-specs.ts:18` **imports** it rather than redeclaring it. Separately, `KNOWN_AGENT_NAMES` **is** independently declared twice — `scripts/seed-harness-specs.mjs:18` and `scripts/seed-harness-specs.ts:32` — so the agent roster itself has two sources of truth. Both seeders emit `INSERT INTO harness_specs …` (`.mjs:223`, `.ts:73`), and `infrastructure/d1/seed-harness-specs.sql` is a generated frozen artifact | `context({name:"AGENT_ALLOWED_TOOLS"})`; `grep -n` across all four files |
| `zustand@^5.0.13` present | `package.json:85` |
| **No IndexedDB library** (`idb`/`dexie`/`localforage`) — new dependency required | `package.json` |
| **No PWA infrastructure at all** — no `manifest.webmanifest` in `public/`, no service worker, no `vite-plugin-pwa` | `ls public`, `vite.config.ts` |
| **There is no working localization system to reuse.** `src/i18n/locales/{en,fr,uk}.json` are 97/106/123 **bytes**, three keys each, and their `app.title` is **"AegisRoute Operator UI"** — orphaned scaffolding from a different product that **nothing imports** (zero hits for `i18n/locales` / `@/i18n` in `src/`). The localization actually in use is `src/hooks/useLocale.ts`, a hard-coded English object that returns `locale: "uk"` regardless. **No i18n library in `package.json`.** The lexicon-overlay machinery Q4 needs must be built. See §9.5 | `cat src/hooks/useLocale.ts`, `wc -c src/i18n/locales/*.json`, `grep -rn "i18n" package.json` |
| The repo has an entrenched **plaintext-persistence habit** the new work must consciously break: `src/routes/diagrams.tsx:35` writes a **session object** to `localStorage`; also `src/routes/__root.tsx:120`, `src/hooks/useNotesEditor.ts:47,66`, `src/pages/DiagramsPage.tsx:138`. The only `crypto.subtle` use in the repo is HMAC request-signing at `packages/storage/src/s3-adapter.ts:26-37` — **there is no at-rest encryption anywhere** | grep |

> **Tooling caveat.** The GitNexus index for `ai-drakon-scaffolder` reports
> `FTS indexes missing — keyword search degraded. Run: gitnexus analyze --repair-fts`, and
> `query()` returns empty for everything. **This is a partial, not total, outage**:
> `context()` and `impact()` do not go through FTS and work correctly — `context()` was used
> in this pass and immediately surfaced the duplicated `AGENT_ALLOWED_TOOLS` above, which a
> filesystem-only pass had missed. So: repair FTS before the architect pass, but use
> `context()`/`impact()` in the meantime rather than skipping the graph entirely. Note also
> the index is pinned to `main` and reports 2 commits behind HEAD.

---

## 3. Merged Information Architecture + component spec

Three workspaces on **one** frontend (ADR-0026 Q5: a reframing of AI-DRAKON's own frontend,
not a second deployed app):

```
AI-DRAKON (single app, role-gated)
├── 📱 Worker space (mobile PWA)          ← new
│    W1  auth / duty-cycle selection      (QR · passkey · OTP)   [NOT SPEC'D — diagram 1 missing]
│    W2  assigned task list               (own org_path subtree only)
│    W3  DRAKON step runner               (one node at a time)
│    W4  evidence capture                 (photo · scan · sensor · comment)
│    W5  Micro-ADR quick logger           (3 fields + media)
│    W6  offline status + sync queue
├── 💻 Supervisor space (desktop)          ← new
│    S1  team dashboard, org_path filter
│    S2  review queue (tasks + Micro-ADRs)
│    S3  advisory verifier badge          [DEFERRED — see §7 P6]
│    S4  approve → PROMOTED into org KB
│    S5  QR invite generation             [NOT SPEC'D — diagram 1 missing]
└── 🛠️ Dev Studio (existing surface)       ← hidden behind role
     AgentStudio · Codegen · PlayPipe · N8NAutomations · Harness · DiagramEditorPage
```

### 3.1 `DrakonStepRunner.tsx`

Replaces the full canvas (`DiagramEditorPage`) for field use — a phone in a workshop cannot
navigate a large graph.

- **Renders exactly one DRAKON IR node** (diagram 2, `n7`: "shows ONLY current DRAKON IR
  node, not full canvas"). No canvas, no pan/zoom.
- Header: task title, progress (step N of M), online/offline badge.
- Step card: node type (`action` / `question` / `end`), instruction text, collapsible
  "Довідка" hints.
- Action area:
  - `action` node → one large "Виконано / Наступний крок" button.
  - `question` node → two buttons mapped to the IR's `one` / `two` edges; advance
    `current_step_id` to the chosen branch (diagram 2, `n8`→`n9`). **Traverse the IR as a
    state machine; never flatten to a linear checklist** (ADR-0026 round-2 correction —
    real `.drakon.json` samples branch, verified in `VERIFICATION-round2.md`).
- Evidence trigger: "Додати фото / скан", mandatory on nodes that require verification.
- Floating "Зафіксувати Micro-ADR" button (diagram 2, `n14`→`n15` anomaly branch).
- **No IR schema change required** — this walks the existing structure.
- **Constraint (multilingual risk)**: node text must render through a localization lookup,
  never the raw `content` string. That lookup does not exist yet — see §9.3 and §9.5.

### 3.2 `EvidenceCapture.tsx`

Diagram 2 `n10` ("captures evidence — photo, scan, sensor reading").

- Types: camera photo (client-side compression), barcode/QR scan of the part or equipment,
  numeric sensor reading (with allowed-range validation), text comment.
- Auto-metadata: ISO-8601 timestamp, worker id, `current_step_id`.
- **Constraint (native/battery risk)**: browser APIs only (`getUserMedia`,
  `BarcodeDetector` where available) with **manual entry as the mandatory fallback**.
  Bluetooth sensors and reliable push are out of a pure-PWA's reach — that is the deferred
  Capacitor/Tauri wrapper's job, not this component's. See §9.4.

### 3.3 `MicroAdrDialog.tsx`

Diagram 2 `n15` ("3 fields: context / action / result + evidence").

- Fields: «Що виявлено / Контекст» → «Що зроблено / Рішення» → «Результат / Пропозиція»,
  plus media attachment.
- Saves locally with status **`PENDING_REVIEW`** and enqueues for sync. `PENDING_REVIEW` is
  canonical and double-sourced: ADR-0026:74 ("promoted only via an explicit `PENDING_REVIEW`
  → manual-approve D1 staging table") and SYNTHESIS-round2:204's
  `status[PENDING_REVIEW|PROMOTED|REJECTED]`. One source plan wrote
  `PENDING_SUPERVISOR_REVIEW`; that string exists **nowhere in live code**, so this costs one
  word in a not-yet-written file, not a migration (see §6, Q2).
- **No auto-promotion, no confidence-score merge, ever** (ADR-0026 Q2; the AI's only role is
  drafting a clean summary of the worker's raw input).

### 3.4 `OfflineSyncBanner.tsx` + `useWorkforceStore.ts`

- States: 🟢 online / synced · 🟡 offline, N pending · 🔵 syncing · 🔴 error or conflict.
- Store owns: active duty cycle, cached diagram subtree, step history, outbound queue.
- **Constraint (device-loss risk)**: local storage **encrypted at rest** (WebCrypto AES-GCM
  over IndexedDB/OPFS — never `localStorage`), and cache **only the worker's own `org_path`
  subtree** (diagram 2 `n2`, `n16`). Key source: see the answer to open question C in §4.3.
- **Constraint (battery risk)**: retry on the browser `online` event + `visibilitychange` +
  backoff timer. **A persistent WebSocket is forbidden** (diagram 2 `n19`: "event-driven
  polling, not a persistent WebSocket (battery)"). See §9.4.
- **Constraint (offline conflict risk)**: see §9.1 — the 🔴 state is load-bearing, not
  cosmetic.

### 3.5 `review/VerificationQueue.tsx`

- `org_path` subdivision filter; card per submission: worker, diagram, timestamp, evidence
  gallery.
- Actions: **Затвердити** (`PENDING_REVIEW` → `PROMOTED`, visible to the subdivision),
  **Повернути на доопрацювання** (mandatory comment), **Відхилити**.
- **Must render correctly with verification data absent** — the advisory badge is a later,
  optional decoration (§7 P6), not a hard dependency.

### 3.6 Ergonomics (mass-user constraint, ADR-0026 §"Design principle", `:173-186`)

1. Touch targets ≥ **52 px** (gloved hands, walking).
2. High-contrast mode — readable in direct sun.
3. **Minimise text entry** — selectors, range sliders, photo capture instead of free text.
4. Terminology: «Зміна», «Завдання», «Бригада», «Польова нотатка». No `AgentStudio`,
   `Codegen`, `PlayPipe`, `Harness` vocabulary anywhere in the worker space. (But see §6, Q4
   — these are *overlay strings*, not type names.)

---

## 4. Resolved open questions (A, B, C)

The first consolidation left three questions open. Two are now closed on evidence; the third
is narrowed to a two-option decision that only Q can take. These answers are load-bearing for
§7's packet order and P1's DDL, which is why they sit in the body and not in the appendix.

### 4.1 Question A — which source plan wins, REDESIGN or SLICE5?

**Answered: the question does not block anything, and precedence is domain-scoped and set by
the ADR, not by either plan's authorship date.**

On the two dimensions where the plans actually conflict, ADR-0026 already rules:

- **Scoping**: ADR-0026:92-94 mandates repository-enforced `org_path` scoping — "not raw
  `LIKE`-prefix SQL written in route handlers — otherwise it's a real regression from this
  ADR's own construction-enforced isolation discipline."
- **Transport**: ADR-0026:95-97 mandates MCP tools, "not a parallel REST API."

REDESIGN-PLAN addresses neither, so it loses both **by omission, not by competition** —
exactly as Conflict A in §7 concludes. On UX surface and component decomposition there is no
ADR rule, so neither plan has authority and the merge there is a judgement call (which is how
Conflict C already treats it).

**Consequence: even if Q declares REDESIGN superseding, ADR-0026:92-97 independently forces
backend-first ordering back in.** The answer does not change the plan. Confirm at leisure;
do not hold P1 for it.

### 4.2 Question B — who produces work items, and what does the schema record?

**Answered in two parts. The product ruling is Q's and still open; the schema decision is
taken here, and is deliberately robust to either ruling.**

**Part 1 — the product question is genuinely unspecified, and the first consolidation leaned
the wrong way.** It assumed "supervisor = review gate, not assigner." Every governing
document is silent on task *creation*: ADR-0026:27-30 describes only consumption ("a worker
uses a UI to **receive** tasks…" — passive, no producer); ADR-0026:145-159's recursive
delegation is about **participants**, not work items (a different object); diagram 2's `n6`
takes the queue as given. But the settled Q4 vocabulary points the other way:
SYNTHESIS-round2:97 maps the primitive `CoordinatorAgent` to, per domain, "Shift supervisor |
**Property dispatcher** | Project coordinator" — and a dispatcher is definitionally an
assigner. **Do not encode either reading in behaviour until Q rules.** The candidate producers
to choose between are: (i) `CoordinatorAgent` dispatches (agent-driven), (ii) a human lead
creates and assigns, (iii) an external system / integration injects items, (iv) any
combination.

**Part 2 — the schema decision, taken now.** SYNTHESIS-round2:201's proposed DDL is
`tenant_work_items(tenant_id, item_id, org_path, assigned_user_id, title, drakon_diagram_id,
current_step_id, status, updated_at)`. It has **no provenance column at all** — only
`assigned_user_id`, the *recipient*. Work-item provenance is literally unrecordable, which
also sits badly with ADR-0024's audit-and-trace model. Because P1 writes this table and P1 is
already blocked, this must be fixed **before** the migration is written, or it costs a second
D1 migration on the same table.

**Decision: `tenant_work_items` gains five columns.**

```sql
created_by       TEXT NOT NULL,  -- identifier of the actor that created the item
created_by_kind  TEXT NOT NULL,  -- 'human' | 'agent' | 'system'
created_at       TEXT NOT NULL,  -- ISO-8601
assigned_by      TEXT,           -- actor that set assigned_user_id; NULL while unassigned
assigned_at      TEXT            -- ISO-8601; NULL while unassigned
```

Rationale, point by point:

- **`created_by` and `assigned_by` are separate columns** because creation and assignment are
  separable events under *both* readings of Part 1. Under "review gate", a human lead or an
  external system creates the item and assignment may come later or from someone else; under
  "dispatcher", `CoordinatorAgent` does both and `created_by == assigned_by` — a benign
  degenerate case, not wasted schema. This is precisely what makes the schema survive Q's
  ruling either way.
- **`created_by_kind` exists** because ADR-0026:32-35 makes humans and AI agents co-equal
  first-class participants. Without a discriminator, an agent identifier and a user
  identifier share one opaque column, and audit cannot distinguish "the dispatcher agent
  assigned this" from "the shift lead assigned this."
- **`created_at` and `assigned_at`** because the base DDL carries only `updated_at`, which the
  offline sync layer will churn on every step advance; a provenance record with no creation
  time is not auditable.
- **Naming precedent**: the sibling table in the same proposal, `tenant_members`
  (SYNTHESIS-round2:199), already carries `invited_by`. Actor-provenance columns are an
  established shape in this schema, not an invention.

**Who sets them: the server, never the client.** These fields are stamped by the same
constructor-bound scoped repository that already binds `tenantId` and `orgPathPrefix`
(SYNTHESIS-round2:113-127), following the live `packages/tenancy/src/repositories.ts` pattern
(`db` + `tenantId` bound at construction, verified at `:258-313`). Concretely,
`ScopedWorkItemRepository`'s constructor additionally binds the authenticated caller's
identity and kind, so `create()`/`assign()` stamp provenance **by construction** and a
client-supplied `created_by` is unrepresentable. This introduces no new principle — it is
ADR-0026:92-94's "enforced by construction, not discipline" rule applied to a second field.

**What is still Q's**: Part 1 only. The column set above does not presuppose an answer.

### 4.3 Question C — what is the encryption key source for the offline queue?

**Answered: still Q's decision, but the option set is now two, not three.**

Undecided everywhere in the governing material: ADR-0026:71-73 states the *requirement*
("encrypted at rest") with no key source; ADR-0026:105-110 repeats it and flags remote
revocation as absent; diagram 2's `device_loss_theft` note says the poison-pill is "not yet
designed"; and the code has no key management to inherit (the only `crypto.subtle` use is
HMAC request-signing at `packages/storage/src/s3-adapter.ts:26-37`).

**A device-bound non-extractable WebCrypto key is eliminated.** ADR-0026:64-70 resolves Q1 to
explicitly include "shared-kiosk fast-user-switching mode". A device-bound key is by
construction shared by every user of that device, so on a kiosk worker B could decrypt worker
A's pending queue — incoherent beside the same ADR's data-minimisation rule at `:109-110`
(cache only the worker's own `org_path` subtree). This is not a preference; it is a
contradiction with a resolved requirement.

The two remaining candidates are both per-user secrets:

| Option | Strength | Weakness |
|---|---|---|
| **WebAuthn PRF extension** | Strong, phishing-resistant, per-participant by construction | Uneven authenticator support — and ADR-0026:68 already hedges auth as "WebAuthn/passkeys **or** OTP", so some deployments will have no passkey at all |
| **PIN-derived key** (KDF over a participant PIN) | Works everywhere, including the OTP-only path | Brute-forceable on a seized device — precisely the threat model of ADR-0026's round-2 question 2 |

"PRF when available, PIN-derived fallback, keyed per participant" is the shape this likely
takes, but it is **not decided here**: it is a security-architecture call for Q, and it
interacts with the still-undesigned remote-revocation mechanism. P0 holds until it is made.

---

## 5. Cross-check against ADR-0026's resolved questions (Q1–Q6)

| Q | Resolved answer | Merged-plan compliance |
|---|---|---|
| **Q1** | PWA, not Termux; IndexedDB/OPFS; WebAuthn/passkey or OTP; QR onboarding; kiosk fast-user-switching | ⚠️ **Gap, not contradiction.** Both plans assume a PWA; **neither plans any PWA work** and the repo has none (no manifest, no service worker, no `vite-plugin-pwa`, no IndexedDB dependency). Neither plan has an auth packet. Kiosk fast-user-switching appears in neither plan. → new prerequisite P0 + explicit "not spec'd" row. |
| **Q2** | On-device tier, encrypted at rest; `PENDING_REVIEW` → manual approve; **no** confidence-score auto-promotion; **not** MemPalace/GitNexus | ⚠️ **Two issues.** (a) A **doc-vs-doc** status-name disagreement: REDESIGN §3.3 used `PENDING_SUPERVISOR_REVIEW`, SLICE5 and diagram 2 use `PENDING_REVIEW`. Repo-wide grep finds `PENDING_REVIEW` in exactly three places, all inside `diagrams/on-shift-work-cycle.drakon.json` (`:88`, `:93`, `:125`), and `PENDING_SUPERVISOR_REVIEW` **nowhere at all** — there is no code or schema to migrate. → **`PENDING_REVIEW` canonical** (ADR-0026:74 + SYNTHESIS-round2:204). (b) A **real** contradiction: SLICE5 Packet 2's acceptance criterion says persist to "`localStorage`/`IndexedDB`" — `localStorage` is plaintext, size-bounded, and unusable for evidence blobs, contradicting Q2's encryption-at-rest requirement. → **`localStorage` struck; IndexedDB/OPFS + WebCrypto only.** Neither plan mentions encryption at all. This is not a spec nit: the repo already persists a **session object** in plaintext `localStorage` (`src/routes/diagrams.tsx:35`) among four other sites, so a contributor pattern-matching on local convention reaches for exactly the wrong API. P3's acceptance criterion must forbid it explicitly. Promotion stays manual in both — ✅ on that point. |
| **Q3** | Supervisor = static `harness_specs` `agent_name` row with its own `allowed_tools`; worker→supervisor requests are ordinary MCP `tools/call` | ⚠️ **Gap.** Neither plan adds a harness-spec role. `AGENT_ALLOWED_TOOLS` currently has 8 roles, none of them workforce. Without `worker` and `supervisor` entries the tools fall back to `EXTERNAL_DEFAULT_TOOLS` and the whole least-privilege story silently evaporates. → **new Packet P2.** |
| **Q4** | Abstract primitives `OrgUnit`/`TeamPod`/`ParticipantRole`/`DutyCycle`/`CoordinatorAgent`/`OperationalRecord` with per-domain lexicon overlays | ⚠️ **Real conflict.** Both plans bake the factory lexicon into structure, not just strings: route `shift.tsx`, store `useWorkforceStore`, type `DrakonStepState`, hard-coded «Бригада №3 / Зміна А». Zero abstract primitives appear anywhere in live code. The building-management case (diagram 4, not drawn) is exactly what this would break. → **Resolution: abstract primitives in D1 column names, TS types and route names; factory words become lexicon-overlay strings only.** `shift.tsx` → prefer a `DutyCycle`-neutral route name. Flagged rather than renamed here, because diagram 4 is the artifact that should settle the vocabulary — and because the overlay has nowhere to live until the P0 i18n decision is taken (§9.5). |
| **Q5** | Reframing of AI-DRAKON's own frontend; new `src/` surface on the existing Worker/D1 backend; not a second app | ✅ Both plans comply. REDESIGN's role-gated Dev Studio is the concrete mechanism (P7). |
| **Q6** | Materialized-path `org_path` sub-groups inside one tenant; **repository-enforced**, not ad-hoc `LIKE` in route handlers | ✅ SLICE5 Packet 1 complies exactly (constructor-bound prefix + isolation test). ❌ REDESIGN has no backend and therefore no enforcement story. ⚠️ **Two caveats.** (i) **This resolution is SYNTHESIS-round2's, not ADR-0026's.** It comes from `SYNTHESIS-round2.md:100-105` ("materialized-path sub-groups within one tenant …, **not nested tenants**") plus the constructor-bound `orgPathPrefix` correction and `ScopedWorkItemRepository` sketch at `:107-127`. **ADR-0026's body never received it**: `:161-171` still presents Q6 under the heading "New open question this raises (Q6)" as an unresolved binary — "(a) hierarchy *within* one Appwrite Team … or (b) nested tenants" — and its round-1 RESOLVED block (`:57-88`) covers only Q1–Q5, even though commit `ca7a2ffd` is titled "resolve ADR-0026 Q1-Q4/**Q6** via research synthesis". Anyone reading the governing ADR alone sees Q6 open with nested tenants still live. → **Action: backport the Q6 resolution into `docs/adr/0026-…md`** (§8, item 5). (ii) Diagram 5 is still undrawn. What it owes is **not** the column shape — that is settled — but the **visibility semantics**: ADR-0026:167-169 asks whether cross-subdivision boundaries need ADR-0025-grade hard isolation or a softer "same organization, different visibility" boundary. That answer is what P1's isolation test encodes, so P1 stays blocked. |
| **MCP-not-REST** correction | New worker actions = new MCP tools reusing Slice 4.4 filtering/audit; **no parallel REST API** | ✅ **Neither plan proposes a REST route.** SLICE5's flow diagram correctly names `workforce.sync_logs` / `workforce.submit_micro_adr` as MCP calls. REDESIGN §3.4 is vaguer ("передача локальних подій на Cloudflare Worker D1") without naming a transport → **bound to MCP here.** ⚠️ Separately: `VERIFICATION-round2.md` lists `cloudflare-worker/routes/workforce.ts` among unverified proposed paths — **that file must not be created**; it would be precisely the parallel REST surface this correction forbids. |
| **State-machine, not flattening** correction | Traverse the IR; show current node + its outgoing choices | ✅ Both plans comply and both name the component `DrakonStepRunner`. |

---

## 6. Convention corrections (live-code conflicts, not ADR conflicts)

1. **MCP tool names.** Proposed `workforce.get_tasks` / `sync_logs` / `submit_micro_adr` use
   underscores; every existing tool is lowercase-concatenated (`drakon.listdiagrams`,
   `docs.backlinks`). → `workforce.gettasks`, `workforce.synclogs`,
   `workforce.submitmicroadr`.
2. **Repository file layout.** SLICE5 Packet 1 proposes
   `packages/tenancy/src/repositories/ScopedWorkItemRepository.ts` — a *directory*. The live
   tree has a flat `repositories.ts` holding all seven classes. → append to the flat file;
   splitting it into a directory is a separate refactor needing its own impact analysis.
3. **Route file layout.** Both plans propose `src/routes/workforce/shift.tsx` — a *directory*.
   `src/routes/` currently has **zero** subdirectories; convention is flat dotted
   (`p.$slug.agents.index.tsx`). → `workforce.shift.tsx`, `workforce.review.tsx`. Adding
   routes regenerates `routeTree.gen.ts` (ADR-0007 contract).
4. **Migration numbering.** `002-workforce-tables.sql` is correct — `001-mcp-tool-audit.sql`
   is the only existing migration.
5. **The role definitions have two sources of truth, and they will drift.** `AGENT_ALLOWED_TOOLS`
   is declared in `packages/harness-contract/src/index.ts:108` and again, independently and
   with identical content, in `scripts/seed-harness-specs.mjs:34`.
   `scripts/seed-harness-specs.ts:18` does **not** redeclare it — it imports it from
   harness-contract, so this is a duplication, not a triplication. But the agent roster
   `KNOWN_AGENT_NAMES` **is** declared twice on its own (`.mjs:18`, `.ts:32`), and
   harness-contract declares it nowhere. `infrastructure/d1/seed-harness-specs.sql` is a
   generated, frozen SQL artifact; both seeders emit `INSERT INTO harness_specs` (`.mjs:223`,
   `.ts:73`).
   **Practical consequence for P2**: since ADR-0026 Q3 defines a supervisor **as** a
   `harness_specs` row, adding `worker`/`supervisor` requires editing three files, not one —
   harness-contract (the tools grant), `.mjs` (its own copy of the grant *and* the roster), and
   `.ts` (the roster only). Editing only the contract package grants the role at the type layer
   while never creating the D1 row. Consolidating these is a worthwhile separate refactor (run
   `impact()` first — `AGENT_ALLOWED_TOOLS` is also imported by
   `cloudflare-worker/__tests__/route-contract.test.ts:23`).
6. **Silent fallback in the existing grant path.**
   `packages/harness-contract/src/index.ts:227-228` resolves grants with a ternary that falls
   back when `AGENT_ALLOWED_TOOLS[agentName]` is absent. This is why a missing `worker` role
   degrades quietly to `EXTERNAL_DEFAULT_TOOLS` instead of failing loudly — confirming the §5
   Q3 concern is real. Pre-existing and out of scope for this slice, but it means P2's
   acceptance test must assert the **positive** grant, not merely absence of error.
7. **Review audit schema vs `McpToolAuditRepository` (Q10).**
   `McpToolAuditRepository.record(specId: string | null, toolName: string, granted: boolean, id?: string)`
   (`packages/tenancy/src/repositories.ts:327-343`) only records MCP tool execution telemetry into
   `mcp_tool_call_audit (id, tenant_id, spec_id, tool_name, granted, called_at)`.
   It does **not** accept `item_id`, `reviewed_by`, `reviewed_at`, or `review_comment`.
   Supervisor review actions (promotions/rejections of work items and Micro-ADRs) require dedicated
   review-audit columns (`reviewed_by`, `reviewed_at`, `review_comment`, `item_id`) in
   `tenant_micro_adrs` / `tenant_work_items` or a dedicated `ReviewAuditRepository` / `tenant_review_audit`
   table to fulfill supervisory governance and ADR-0024 without overloading low-level MCP tool dispatch telemetry.

---

## 7. Merged implementation sequence (one ordered list)

REDESIGN-PLAN proposes 4 phases; SLICE5-PLAN proposes 5 atomic packets. They **agree** on the
frontend order (state/offline → runner → supervisor) and on all five component names and file
paths. Three real conflicts, resolved below.

### Conflict A — backend first, or not at all?

- SLICE5-PLAN Packet 1 is backend (D1 migration + scoped repositories).
- REDESIGN-PLAN has **no backend phase whatsoever** — it starts at `src/types/workforce.ts`.

**Resolved: backend first (SLICE5's ordering wins).** The `org_path` scoped repository *is*
the security primitive of this whole slice — ADR-0026:92-94 states the sub-group boundary must
be enforced by construction (constructor-bound prefix), "not a discipline problem." Building a
client store against an unspecified server contract guarantees rework of the row shapes the
store persists, and the `org_path` isolation test is the acceptance gate for the entire slice.
REDESIGN-PLAN's Phase 1 silently *depends* on those row shapes without ever producing them;
that is an omission, not a competing design. **This ordering holds regardless of how Q answers
question A** (§4.1).

### Conflict B — where does `MicroAdrDialog` go?

- REDESIGN Phase 2 bundles it with the runner; SLICE5 Packet 4 puts it after.

**Resolved: after (SLICE5 wins).** In diagram 2 the Micro-ADR sits on the `n14` anomaly
branch, not the happy path — the runner must be independently verifiable against the main
traversal first. Also keeps the packet at ≤3 files per the atomic-packet rule.

### Conflict C — where does `OfflineSyncBanner` go?

- REDESIGN §3.4 specs it *together with the store*; SLICE5 Packet 4 ships it with the
  Micro-ADR dialog.

**Resolved: with the store (REDESIGN wins).** The banner is a pure projection of the store's
sync state machine and is the only *observable* surface that state machine has. Without it,
the store packet's acceptance criterion ("queues offline, fires on `online`") can only be
checked from a console. Packet 4's own stated criterion is about Micro-ADR persistence and
does not need the banner. This is a judgement call, not a correctness issue — reversing it
costs nothing.

### The merged order

| # | Packet | Files (≤3) | Acceptance criterion | Gate |
|---|---|---|---|---|
| **P0** | **Prerequisites — not in either source plan** | — | Diagrams 1/3/4/5 drawn and committed; diagram 2 committed; GitNexus FTS index repaired; PWA shell decision taken (manifest + service worker + `idb` dependency); encryption-key-source decision taken (§4.3 — now a two-way choice); **i18n runtime chosen and wired** (library + catalogue loading + locale switching) and the fate of the orphaned `src/i18n/locales/` "AegisRoute" stub decided (§9.5 explains why this is a prerequisite and not a P4 detail); work-item producer ruled on (§4.2 Part 1) | **BLOCKING** |
| **P1** | D1 migration + scoped repositories | `infrastructure/d1/migrations/002-workforce-tables.sql`; append `ScopedWorkItemRepository` + `ScopedMicroAdrRepository` to `packages/tenancy/src/repositories.ts` | `org_path` prefix isolation: `/brigadeA/` queries return zero `/brigadeB/` rows; plus the two-tenant cross-boundary rejection test every D1 route has needed since Slice 3.3. **The migration must include the five provenance columns decided in §4.2** (`created_by`, `created_by_kind`, `created_at`, `assigned_by`, `assigned_at`) — omitting them costs a second migration on this same table. Provenance is stamped by the repository constructor, never accepted from the client | **Blocked on resolving `resolveTenant()` membership-lookup** (Re-verification log item 3, `packages/tenancy/src/index.ts:79`; currently hardcodes `roles: ['owner']` without membership lookup, so non-owner authorization on-ramp is missing) and **blocked on diagram 5 (Q6)** for the **visibility semantics** (ADR-0026:167-169: hard isolation vs. softer same-org visibility; Model A vs Model B) |
| **P2** | MCP tools + harness-spec roles — **missing from both source plans** | `cloudflare-worker/worker-mcp-drakon.js` (tool defs); `packages/harness-contract/src/index.ts` (`worker`, `supervisor` entries in `AGENT_ALLOWED_TOOLS`); `scripts/seed-harness-specs.mjs` (its own duplicate grant table **and** roster) and `scripts/seed-harness-specs.ts` (roster only — it imports the grant table). ADR-0026 Q3 defines a supervisor *as* a `harness_specs` row, so editing only the contract package grants the role at the type layer while **never creating the D1 row**. That is 4 files, one over the ≤3 atomic-packet rule — either split the MCP tool defs into their own packet or take the exception deliberately (see §6.5) | Worker role's `tools/list` shows only workforce tools; supervisor role's shows the review tools; tool calls audited via existing `McpToolAuditRepository` and review decisions via review-audit columns (§6.7); **the seeded D1 row matches the contract table**; and the test asserts the **positive** grant, not merely absence of error (§6.6) | Blocked on P1 |
| **P3** | Types + Zustand store + offline layer + sync banner | `src/types/workforce.ts`; `src/store/useWorkforceStore.ts`; `src/components/workforce/OfflineSyncBanner.tsx` | Steps and evidence persist across a network drop; sync fires on the `online` event; **no persistent WebSocket opened**; queue is encrypted at rest; **`localStorage` is explicitly forbidden** (§5 Q2b) | Blocked on P2 (row shapes + tool contract) |
| **P4** | State-machine step runner | `src/components/workforce/DrakonStepRunner.tsx`; `EvidenceCapture.tsx`; `src/routes/workforce.shift.tsx` | Only the current node renders; picking a `question` branch advances `current_step_id` along the correct IR edge; node text renders through the localization lookup, never the raw `content` string | Blocked on P3 and on P0's i18n decision |
| **P5** | Micro-ADR field logger | `src/components/workforce/MicroAdrDialog.tsx` | Note saves with status `PENDING_REVIEW` and enters the outbound queue | Blocked on P3 |
| **P6** | Supervisor review queue | `src/components/workforce/review/VerificationQueue.tsx`; `src/routes/workforce.review.tsx` | Supervisor sees evidence, filters by `org_path`, one click sets `PROMOTED` and stamps review audit columns (`reviewed_by`, `reviewed_at`, `review_comment`); **renders fine with no verifier data** | Blocked on P1, P2 |
| **P7** | Workspace switcher (Worker / Supervisor / Dev Studio) | existing shell — `WorkspaceShell`, `AstryxSideNav` | Dev surfaces invisible to a worker role; integration test of offline → D1 round trip | Blocked on P4, P6. **Touches existing code → run `impact()` first per CLAUDE.md** |
| **—** | `VerifierScoreBadge` + `tenant_shift_verifications` (K=4 advisory) | — | — | **DEFERRED, not in this slice.** Both source plans place it in the supervisor packet; `ADDENDUM-llm-verifier-workforce.md` explicitly says it is Slice 4.0-4.3 territory, "still blocked on 3.5/3.7 per CURRENT-PLAN.md." Removing it from the critical path resolves that contradiction. |
| **—** | Worker onboarding / QR provisioning / passkey-OTP auth | — | — | **NOT SPEC'D.** Both plans show "QR авторизація" as screen W1 but neither has a packet for it, because diagram 1 does not exist yet. |

---

## 8. Blockers before the Slice 5.1 architect pass

Complete list, ordered by whether Q's input is required. Nothing in §7 may start until items
1–4 clear.

**Requires Q to draw or decide / Hard Blockers:**

0. **[NEW BLOCKER before P1] Membership-lookup in `resolveTenant()`** (Re-verification log п.3, `packages/tenancy/src/index.ts:79`):
   `resolveTenant()` currently hardcodes `roles: ['owner']` for any caller, explicitly noting in code comments that membership lookup is "out of scope for the initial tenant-of-one rollout". Without real membership-lookup, neither Model A nor Model B has an on-ramp for non-owner worker/supervisor authorization. This must be resolved before P1/P2.
1. **[CLOSED] Draw diagrams 1, 3, 4 and 5** (§gate table) — all 5 diagrams are drawn and committed (commits `56fe41cb` and `eda65238`, see Re-verification log item 4). **Diagram 5 (Q6 hierarchy Model A/B decision gate) remains open for Q's choice between materialized path and nested sub-tenants.**
2. **Rule on the work-item producer** (§4.2 Part 1: `CoordinatorAgent` dispatches / human lead
   assigns / external system injects / combination). Now urgent, because P1 writes
   `tenant_work_items` and the ruling determines what values flow into the provenance columns.
   The *columns themselves* are decided (§4.2 Part 2) and do not wait on this.
3. **Choose the encryption key source** (§4.3): WebAuthn PRF or PIN-derived, or the
   PRF-with-PIN-fallback hybrid. Device-bound keys are eliminated by the kiosk requirement.
4. **Take the remaining P0 decisions**: PWA shell (manifest + service worker + `idb`
   dependency), and the **i18n runtime** (§9.5) — §3.1's localization constraint and §5 Q4's
   lexicon overlay both depend on a substrate that does not currently exist.

**Does not require Q — cheap, unblocked, and should happen now:**

5. **[CLOSED] Commit diagram 2** — committed in `56fe41cb` along with diagrams 1, 3, 4, 5 and plan.
6. **Backport the Q6 resolution into `docs/adr/0026-…md`.** The ADR body still shows Q6 open
   with nested tenants live, despite commit `ca7a2ffd` claiming to have resolved it (§5 Q6).
   Until this lands, the governing ADR contradicts the synthesis it cites at `:59`.
7. **Decide the harness-role duplication** (§6.5): `AGENT_ALLOWED_TOOLS` has two independent
   declarations and `KNOWN_AGENT_NAMES` has two more. Consolidate them into one source of
   truth (run `impact()` first), or knowingly accept P2's 3-file role edit and its drift risk.
   Do not discover this mid-P2.
8. **Decide the fate of `src/i18n/`** (§9.5): it is dead code from a different product
   ("AegisRoute Operator UI"), imported by nothing. Delete it or document why it stays — but
   per Chesterton's Fence, confirm it is genuinely dead first rather than bulk-deleting.
9. **Repair the GitNexus FTS index** (`gitnexus analyze --repair-fts`) and re-verify §2's
   facts through the graph. `context()`/`impact()` work today; `query()` does not.
10. **Housekeeping** (§10): delete or regenerate the stale research-folder ADR copy; pull the
    two remote plan files into the tracked tree or delete the remote duplicates;
    fast-forward `.161`.

Only after 0–4 does the architect-planning pass run — turning this document into
`specs/NNN-…/spec.md` or ADR-0027, and flipping ADR-0026's Decision from "Not yet made."

---

## 9. Round-2 risks as component constraints

Folded in from the on-shift diagram's `meta.round2_risk_checklist` and ADR-0026:103-118. These
are binding on the components named, not general advice.

### 9.1 Offline sync conflict — nodes `n16`, `n17`, `n19`
**Binds: `useWorkforceStore.ts`, `ScopedWorkItemRepository`, `OfflineSyncBanner`.**
No merge policy is decided (CRDT vs. lease/checkout). The diagram shows *where* the conflict
window opens (`n16` local write → `n19` deferred sync); it does not close it. Constraint until
a policy exists: the store records an `updated_at`/version witness at capture time, the sync
tool **compares and rejects rather than overwrites**, and a rejected item stays local with a
`CONFLICT` status surfaced in the 🔴 banner state for a human to resolve. **Last-write-wins is
forbidden** — it silently corrupts physical-world state (two workers each believing they hold
the same tool).

### 9.2 Device loss / theft — nodes `n1`, `n2`, `n16`
**Binds: `useWorkforceStore.ts`, `EvidenceCapture`, and the auth flow (not yet spec'd).**
`n1`/`n2` already carry the agreed mitigations: passkey/OTP auth, and caching **only the
worker's own `org_path` subtree** — the client must never request tenant-wide data even though
the repository would scope it anyway (defence in depth + data minimisation). `n16`'s "local
encrypted queue" needs WebCrypto AES-GCM over IndexedDB; the key source is narrowed to two
options in §4.3 and remains Q's call. Remote revocation / poison-pill is **not designed** — do
not assume it in any packet's acceptance criteria.

### 9.3 Multilingual runtime — node `n12`
**Binds: `DrakonStepRunner`, and the supervisor MCP call path.**
The runner must render node text through a localization lookup keyed by node id, never the raw
IR `content` string — otherwise localization requires editing diagrams. `n12` (the supervisor
MCP call) is where translation middleware for AI-generated content would sit. Neither is
designed, and neither has a substrate to build on — see §9.5.

### 9.4 Native hardware + battery — nodes `n10`, `n19`
**Binds: `EvidenceCapture`, `OfflineSyncBanner` / sync engine.**
`n10`: browser-only capture with a manual-entry fallback; Bluetooth sensors and reliable push
are out of scope pending a thin Capacitor/Tauri wrapper (deferred, not promised away). `n19`:
**the sync engine must be event-driven** — `online` event, `visibilitychange`, backoff timer.
**Opening a persistent WebSocket is a spec violation**, not an optimisation choice; it drains
a phone over an 8-hour duty cycle.

### 9.5 The i18n substrate does not exist
**Binds: `DrakonStepRunner` (§9.3), the Q4 lexicon overlay (§5 Q4), and P0.**

§9.3's localization lookup and §5 Q4's "factory words become overlay strings" both assume a
working localization system. There isn't one:

- `src/i18n/locales/{en,fr,uk}.json` are **97 / 106 / 123 bytes**, three keys each
  (`app.title`, `common.loading`, `common.error`), and `app.title` is
  **`"AegisRoute Operator UI"`** — a different product. Orphaned scaffolding.
- **Nothing imports them.** Zero hits for `i18n/locales`, `@/i18n` across `src/`.
- The localization actually in use is `src/hooks/useLocale.ts`: a hard-coded object of ~100
  **English** DRAKON-editor strings, typed from `@/lib/i18n/types` (a *different* path), whose
  hook body is `return { locale: "uk", t: translations }` — it reports Ukrainian and serves
  English. No switching, no catalogue loading, no interpolation.
- **No i18n library in `package.json`** (no i18next / react-intl / lingui).
- **Empirical UX audit findings**: Live UX inspection confirms that `/architect` is completely English amidst an otherwise Ukrainian UI, and `/notebooks` presents a mixed-language interface. This is direct live-code evidence that no working localization system exists.

So the Q4 resolution has nowhere to put the factory words, and P4 cannot satisfy §9.3's "never
the raw `content` string" constraint. Choosing and wiring an i18n runtime is a **P0
prerequisite**, not a P4 implementation detail.

*Chesterton's Fence*: do **not** bulk-delete `src/i18n/locales/`. "AegisRoute" suggests a
deliberate import from another codebase; confirm it is genuinely dead before removing it
(§8, item 8).

---

## 10. Housekeeping — the actual file situation (for Q; not fixed by this pass)

Factual inventory as of 2026-08-25. **Nothing on any remote host was modified.**

**Three checkouts of the same repo:**

| Host | Path | Branch | HEAD |
|---|---|---|---|
| `n8n-teilscail` (local, this machine) | `/home/ubuntu/projects/ai-drakon-scaffolder` | `phase0-stabilize` | `0f984a12` |
| `.184` dev server (`100.113.140.25`) | `/home/vokov/projects/ai-drakon-scaffolder` | `main` | `0f984a12` |
| `.161` OrangePi (`100.65.225.122`) | `/home/vokov/workspace/ai-drakon-scaffolder` | `phase0-stabilize` | `6df20baf` — **87 commits behind** |

**Uncommitted plan files — four copies of two documents, zero of them local:**

- `docs/plans/WORKFORCE-UI-AND-SLICE5-PLAN.md` — untracked (`??`) on **both** `.184` and
  `.161`. **The two copies are byte-identical** (11106 bytes, mtime `Aug 24 19:41`, `diff`
  exit 0). Not present locally.
- `docs/plans/WORKFORCE-UI-REDESIGN-PLAN.md` — untracked (`??`) on **both** `.184` and `.161`
  (the task brief described it as `.184`-only; it is on both). **The two copies are
  byte-identical** (16152 bytes, mtime `Aug 25 17:55`, `diff` exit 0). Not present locally.
- `docs/plans/_INDEX.md` — modified (` M`) on both remotes, with an identical diff.

**Untracked locally:**
- `docs/research-org-workforce-vision-2026-08-24/diagrams/` — **the on-shift diagram, the one
  artifact that satisfies part of ADR-0026's gate, is not committed.** `git status` reports
  the directory as untracked (`??`) and `git log -- …/diagrams/on-shift-work-cycle.drakon.json`
  returns **zero commits**. The file exists on disk (6624 bytes, mtime Aug 25 16:56) but has
  never entered git history.
- `docs/research-org-workforce-vision-2026-08-24/WORKFORCE-UI-CONSOLIDATED-PLAN.md` — this
  document, also untracked.
- `docs/handoff/2026-08-19-full-source-snapshot.pdf`

**Stale duplicate ADR:**
`docs/research-org-workforce-vision-2026-08-24/ADR-0026-organizational-ai-workforce-vision.md`
(177 lines) is an **outdated snapshot** of `docs/adr/0026-…md` (210 lines) — it still shows
Q1–Q4 as "TBD" where the canonical copy shows them RESOLVED (`ca7a2ffd`). Anyone reading the
research folder in isolation would work from superseded open questions.

**Tooling:** the GitNexus index reports `FTS indexes missing — keyword search degraded`;
`query()` returns empty for everything, while `context()`/`impact()` work. Needs
`gitnexus analyze --repair-fts` (or `--force`); the index is also pinned to `main` and 2
commits behind HEAD.

---

## 11. Remaining assumptions

Two assumptions from the original consolidation survive verification and are still
assumptions. (The other three have been resolved into the body: plan precedence → §4.1;
work-item producer → §4.2; encryption key source → §4.3.)

1. **The two source plans are peers, not successive drafts.** They have different mtimes
   (SLICE5 Aug 24, REDESIGN Aug 25) and REDESIGN is richer on UX while SLICE5 is richer on
   backend, so they were merged rather than treating the newer as superseding. Per §4.1 this
   is not load-bearing: ADR-0026:92-97 forces the same outcome either way.
2. **`workforce.submitmicroadr` is treated as a third MCP tool**, though SYNTHESIS-round2:135
   names only two (`get_tasks`, `sync_logs`). Diagram 2's `n18` names
   `workforce.submit_micro_adr` explicitly, so it was kept.

`org_path` as a string materialized path (`/root/workshop-3/assembly-b/`) is **not** an
assumption: the alternative was considered and explicitly rejected with reasons —
ADR-0026:161-171 raises nested tenants as option (b), "a materially bigger change to the
tenancy model than (a)", and SYNTHESIS-round2:103-105 rejects it because nested tenants "would
fracture ADR-0025's hard isolation guarantee and massively complicate billing aggregation."

---

## 12. Verification & Corrections Log (2026-08-25)

Audit trail for the two passes that ran after the initial consolidation. The body above is
already corrected; this section records *what* changed and *why*, so a reader can tell which
statements are original and which were revised. Verification used
`mcp__sequential-thinking__process_thought` plus `mcp__gitnexus__context` / `impact`
(`query()` was unavailable — FTS degraded) against `repo="ai-drakon-scaffolder"`, and direct
reads of the live checkout at `phase0-stabilize` / `0f984a12`.

### 12.1 Original contradictions — verification outcomes

| # | Claim | Outcome |
|---|---|---|
| 1 | No encryption-at-rest exists for local data | **VERIFIED.** The only `crypto.subtle` use is HMAC request-signing (`packages/storage/src/s3-adapter.ts:26-37`). Nothing encrypts data at rest. |
| 2 | No `worker`/`supervisor` role grants exist | **VERIFIED.** `AGENT_ALLOWED_TOOLS` has 8 roles, none workforce (`packages/harness-contract/src/index.ts:108`). |
| 3 | Both plans bake the factory lexicon into structure | **VERIFIED.** Zero abstract Q4 primitives (`OrgUnit`, `TeamPod`, …) appear anywhere in live code. |
| 4 | No PWA infrastructure | **VERIFIED exactly.** No `manifest.webmanifest`, no service worker, no `vite-plugin-pwa`, no `idb`/`dexie`/`localforage`. |
| 5 | `PENDING_REVIEW` vs `PENDING_SUPERVISOR_REVIEW` conflict | **PARTIAL FALSE POSITIVE — downgraded.** `PENDING_SUPERVISOR_REVIEW` exists nowhere in live code; `PENDING_REVIEW` appears only in diagram 2 (`:88`, `:93`, `:125`). This is a doc-vs-doc disagreement with no code or schema to migrate. The canonical choice stands and is now double-sourced (ADR-0026:74 + SYNTHESIS-round2:204). |
| 6 | Q6 sequencing blocks P1 | **VERIFIED, but originally mis-cited.** P1 is blocked, but not because the schema shape is undecided — that is settled. What diagram 5 owes is the visibility semantics (ADR-0026:167-169). §5 Q6 and P1's gate cell were rewritten accordingly. |

### 12.2 New findings added during verification

| # | Finding | Where it landed |
|---|---|---|
| N1 | **Corrected during harmonization — originally overstated as "triplicated".** `AGENT_ALLOWED_TOOLS` has **two** independent declarations, not three: `packages/harness-contract/src/index.ts:108` and `scripts/seed-harness-specs.mjs:34` (identical contents). `scripts/seed-harness-specs.ts:18` **imports** it. However `KNOWN_AGENT_NAMES` **is** independently declared twice (`.mjs:18`, `.ts:32`), so the agent roster has two sources of truth of its own, and both seeders emit `INSERT INTO harness_specs` (`.mjs:223`, `.ts:73`). Net effect on P2 is unchanged in size — three files must be edited to add a role — but for a corrected reason. | §2 table, §6.5, P2 file list, §8 item 7 |
| N2 | `src/i18n/` is **dead code from a different product** ("AegisRoute Operator UI"), imported by nothing. The original plan's "reuse `src/i18n/`" fact is **withdrawn**. Real localization is hard-coded English in `src/hooks/useLocale.ts`, which reports `locale: "uk"`. | §2 table, §9.5, new P0 prerequisite, §8 items 4 and 8 |
| N3 | **ADR-0026's body never received Q6's resolution**, despite commit `ca7a2ffd` being titled "resolve ADR-0026 Q1-Q4/Q6 via research synthesis". `:161-171` still presents Q6 as an open binary with nested tenants live. | §5 Q6, §8 item 6 (recommend backport) |
| N4 | `tenant_work_items` (SYNTHESIS-round2:201) has **no `created_by`/`assigned_by`/`source` column** — only `assigned_user_id`, the recipient. Provenance is unrecordable, which conflicts with ADR-0024's audit-and-trace model. | §4.2, P1 acceptance criterion |
| N5 | The original assumption "no alternative `org_path` encoding was considered" is **false**. Nested tenants were considered (ADR-0026:161-171) and explicitly rejected with reasons (SYNTHESIS-round2:103-105). This strengthens P1's grounding rather than weakening it. | §11 closing paragraph (moved out of the assumptions list) |
| — | The GitNexus caveat was **too broad**. FTS is genuinely degraded and `query()` returns nothing, but `context()`/`impact()` do not use FTS and work — `context()` found N1 that a filesystem-only pass had missed. | §2 tooling caveat |
| — | Diagram 2 remains **uncommitted**: `git log` over `diagrams/on-shift-work-cycle.drakon.json` returns zero commits. Re-confirmed during the harmonization pass. This plan document is untracked too. | Gate table, §8 item 5, §10 |

### 12.3 Open questions closed during these passes

- **A (plan precedence)** → answered in §4.1: not a blocker; ADR-0026:92-97 forces
  backend-first regardless of which plan Q prefers.
- **B (work-item producer)** → split in §4.2: the product ruling is still Q's and is now
  *urgent* because it is a schema-adjacent decision; the **schema decision itself is taken
  here** (five provenance columns, stamped server-side by the scoped repository) and is
  deliberately robust to either ruling.
- **C (encryption key source)** → narrowed in §4.3: device-bound keys eliminated by the
  shared-kiosk requirement (ADR-0026:64-70); WebAuthn PRF and PIN-derived remain.

### 12.4 What this harmonization pass changed in the document itself

- Removed all 20 inline `[Verified 2026-08-25 — …]` markers and the header preamble
  summarising them; each correction is now stated directly in the prose it corrects.
- Removed the struck-through text (`~~…~~`); corrected statements replace them outright.
- Added §4 (Resolved open questions A/B/C) as a body section, because P1's DDL and §7's
  ordering both depend on its content.
- Added §8 (Blockers before the Slice 5.1 architect pass) as a single complete, ordered list,
  replacing the previous §9 plus its amendment block.
- Renumbered sections; all internal cross-references were updated to match.
- No factual claim was added that is not traceable to ADR-0026, `SYNTHESIS-round2.md`,
  diagram 2, or a live-code observation cited inline. The one genuinely new *decision* is
  §4.2 Part 2 (the provenance columns), which is flagged as a decision, not a finding.

---

## 13. Live UX Audit Findings & Pre-existing Defects (2026-08-29)

Живий UX-аудит (2026-08-29) на середовищі dev-184 / baseline тестування виявив такі дефекти та спостереження:

1. **Critical Bug: Save diagram → HTTP 500 (`harness_specs.id` UNIQUE constraint)**
   - **Симптом:** Спроба зберегти нову DRAKON-схему в редакторі повертає `HTTP 500: UNIQUE constraint failed: harness_specs.id`.
   - **Класифікація:** Pre-existing bug — blocks baseline, unrelated to redesign but touches the same table (`harness_specs`).
   - **Пріоритет:** **Critical**.
2. **High-priority Defect: `/agents` порожній vs `/pipelines`**
   - **Симптом:** Маршрут `/agents` відображає "No agents found", тоді як `/pipelines` показує реальний робочий список агентів.
   - **Класифікація:** High-priority дефект — конкретний приклад проблеми "single source of truth" та розсинхронізації списків агентів/ролей (§6.5, Q3/Q4).
   - **Пріоритет:** **High**.
3. **i18n P0 Concrete Example: Англомовні та змішані сторінки**
   - **Симптом:** Сторінка `/architect` є повністю англомовною серед решти україномовного UI; `/notebooks` містить змішану мовну розмітку.
   - **Класифікація:** Конкретний приклад дефекту локалізації для передумови P0 та §9.5, що підтверджує необхідність повноцінного рантайму i18n перед розробкою інтерфейсу працівника.
4. **Термінологія в живому nav (Dev-жаргон у навігації)**
   - **Симптом:** У живій навігації присутній dev-жаргон (`Codegen`, `DEV CYCLE`, `Execution Trace`, `Harness`), який має бути повністю прихований або перекритий для worker-ролі.
   - **Примітка щодо аудиту термінів:** `TERMINOLOGY_AUDIT.md ще не отримано, буде доповнено (2026-08-29 — джерело не знайдено в репо, потрібно від Q)`.


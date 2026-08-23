SESSION 2026-08-22/23 — ARCHITECT HANDOFF (Claude Sonnet 5 architect, replacing Perplexity Pro)

## What this is

Package this session built for a new architect (Claude-Sonnet-5-based, replacing the prior
Perplexity-Pro-based one). It replaces the two earlier synthesis reports as the primary
entry point — read this file first, then dig into the referenced docs only as needed.

## Where everything lives (all on .184, repo ai-drakon-scaffolder)

- THIS FILE: docs/architect-handoff-2026-08-23/HANDOFF.md
- Prior architect synthesis (round 1, Opus, still useful for the OpenBot/HarnessAdapter/
  LLM-as-a-Verifier architecture question — NOT yet re-verified against tonight's Slice 3.2
  work): docs/reports/2026-08-23-openbot-harnessadapter-revised-plan.md
- Prior architect synthesis (round 2, Opus, fleet-reconciled, the authoritative source for
  the full Slice 3.0c-4.5 sequence, Owner Decision Memo, Security Invariants SI-1..SI-12,
  Contradictions, Open Questions Q-1..Q-17): docs/reports/2026-08-23-openbot-verifier-final-synthesis.md
- Route-auth matrix v1 (STALE — wrong gate line number, describes N1/N2 as still-broken;
  kept for history only, do not use): docs/contracts/worker-route-auth-matrix.md
- Route-auth matrix v2 (CURRENT, 68-route exhaustive audit, basis for Slice 3.2):
  docs/contracts/worker-route-auth-matrix-v2.md
- Fresh code dump of the whole repo (generated tonight, see "Code dump" section below)

## What actually happened tonight (chronological, condensed)

1. Two rounds of fleet-coordinated architecture re-planning for OpenBot/HarnessAdapter/
   LLM-as-a-Verifier integration (see the two synthesis reports above). Owner (Q) accepted
   all 17 items of the Owner Decision Memo — no further investigation needed on those.
2. During that work, THREE live production security holes were found and fixed:
   a. Plaintext MCP_API_KEY committed in wrangler configs — rotated to a Cloudflare secret,
      removed from source (commit 863985d1).
   b. OWNER_EMAILS was unset in production — meant verifyOwnerAuth() granted 'owner' to
      EVERY Appwrite-authenticated user (fail-open by design, loudly logged, but still a
      real gap in prod). Set live to tukroschu@gmail.com,maxfraieho@gmail.com.
   c. /ws/room/* and /v1/diagram/*/sync were dispatched BEFORE any auth check at all
      (unauthenticated callers could reach the Durable Objects directly) — fixed as
      Slice 3.6 (commit 18da2af9), deployed.
3. A near-miss config-drop incident during credential rotation: a PATCH to the Workers
   settings endpoint with only the new MCP_API_KEY in the body silently dropped 5 other
   live bindings. Caught immediately via a follow-up GET, restored, verified. Lesson:
   PATCH /workers/scripts/{name}/settings does NOT merge — GET full state first, always.
4. Slice 3.1 (route-contract characterization tests, commit c056cdc5) and Slice 3.6
   landed and deployed.
5. Tonight (2026-08-23), continuing per Q's instruction: Slice 3.2 designed and shipped.
   - Delegated an exhaustive 68-route audit to agy on the .30 Windows host (using its
     `agy` CLI) — result: docs/contracts/worker-route-auth-matrix-v2.md. Confirmed the
     real global gate was at L2866-2869 (not L2848/L2849 as the stale v1 doc said), and
     found 3 NEW zero-auth routes leaking Appwrite execution logs
     (/v1/notes/semantic-graph-status, /v1/codegen-status, /v1/compile-status) that
     neither prior synthesis report had caught.
   - Implemented a single declarative ROUTE_AUTH_TABLE (method+path matcher -> 'none' |
     'authenticated' | 'owner'), consulted once at the top of fetch(), replacing the old
     positional gate entirely (removed, now redundant). Fixed the weak-auth-bypass bug on
     7 routes and the zero-auth leak on 3 routes, all in one place instead of touching
     every handler.
   - 62/62 tests passing on both .184 (Alpine/ARM) and .30 (Windows) before merge.
   - Merged to main (e8c9097f), deployed live (version b84dad42), smoke-tested via curl:
     previously-vulnerable routes now correctly 401 unauthenticated callers; /health still 200.
   - Implementation: cloudflare-worker/worker-mcp-drakon.js (ROUTE_AUTH_TABLE + resolveRouteAuth,
     inserted after verifyOwnerAuth(); gate call inserted right after the JWT_SECRET check in
     fetch(), before any route dispatch).

## New finding not in either prior synthesis report

**SDD Arbiter pre-commit hook** exists on .184's git config for this repo — runs in
dry-run/shadow mode (does NOT block commits yet), prints an ADR-drift verdict per commit.
It gave a false-positive FAIL on a pure-documentation commit (misread a route-audit MARKDOWN
file's prose describing existing bugs as if it were describing NEW code changes), then a
clean PASS on the actual Slice 3.2 code commit. Worth the new architect knowing this exists
before it potentially starts blocking commits for real — nobody on this session's chain
(Q included) had prior knowledge of when/how this hook was introduced. Find it via
`git config --get core.hooksPath` or the `.git/hooks/pre-commit` file on .184's clone.

## Deliberate design decision made tonight, not yet reviewed by Q

Slice 3.2's central gate runs auth BEFORE the /ws/room/* and /v1/diagram/*/sync handlers'
own binding-existence checks. Net effect: an unauthenticated caller now gets 401 even when
ROOM_DO/DIAGRAM_SYNC is unbound (previously got 500, leaking a config-error signal
pre-auth). An authenticated owner still sees 500 if the binding really is missing. This is
more conservative (denies information to unauthenticated callers) but IS a behavior change
from what Slice 3.6's tests originally asserted as intentional ("config error, not a
security control"). Tests were updated to match the new ordering
(cloudflare-worker/__tests__/route-contract.test.ts) but the underlying judgment call
("auth-first is strictly better here") has not been explicitly signed off by Q beyond the
blanket "деплой, у нас досить AI" go-ahead for the whole slice. Flag if this surprises anyone.

## Still open / not done tonight

From the round-2 synthesis's Slice 3.0c-4.5 sequence — everything past 3.2 is untouched:
- Slice 3.3 (tenancy/D1) — real per-room/per-diagram membership, not just owner-or-nothing.
  This is the actual fix for the "room IDs are not tenant-isolated" note left in Slice 3.6's
  code comment (any owner can join any room by guessing/knowing its ID).
- Slice 3.4 (server-resident spec resolution), 3.5 (generic runner registry), 4.4 (tenant-
  filtered MCP), 3.7 (OpenBotHarnessAdapter), 4.0-4.3 (RunSnapshot/audit/verifier), 4.5
  (generic UI) — all still blocked on 3.3's prerequisite infrastructure per the standing plan.
- 13 routes in the v2 route audit were originally expected to need product-owner judgment
  calls before classification — in practice agy's audit resolved ALL 68 with "high"
  confidence and no UNCERTAIN flags, so this turned out to be a non-issue. Worth knowing
  the earlier fear (from a prior, less-careful pass by a different agent) did not
  materialize once a careful agent actually did the read.
- Non-canonical wrangler configs (wrangler-antigravity.jsonc, plain cloudflare-worker/
  wrangler.toml) still exist alongside the canonical worker-wrangler.toml, never formally
  disposed of (renamed/removed/documented as dead).
- docs/contracts/worker-route-auth-matrix.md (v1, stale) still exists alongside v2 — should
  probably be deleted or clearly marked superseded, not left for a future reader to pick
  the wrong one.
- Oracle Cloud Claude instance (used for earlier fleet work) is on a weekly usage limit
  until 2026-08-25 09:00 Europe/Zurich — anything explicitly deferred to Oracle in the
  round-2 synthesis (the O-1..O-10 list) is still blocked until then.

## Fleet / infra notes for the new architect

- .184 = canonical dev server (Alpine Linux, git push/pull authority, GitNexus + ai-memory
  live here). All real commits should originate from or be relayed through here.
- .30 = Windows build/test host, has its own `agy` CLI (Google Antigravity) for delegated
  investigation work, git push from here fails (Windows Credential Manager has no tty over
  SSH) — pull/test here, but relay pushes through .184.
- .234 = weak Linux SBC (`agy` CLI too, same product, different install) — used for one
  route-audit dispatch attempt this session, exited early without a synchronous wait
  (background job pattern that isn't yet reliable for this specific host/CLI combo).
- GitNexus reindex requires the FULL volume mapping the live gitnexus-server container
  uses (`-v gitnexus_gitnexus-data:/data/gitnexus -v /home/vokov/projects:/projects`) — a
  one-off container missing the /data/gitnexus volume fails with "registry entry ...  was
  not added" every time. This tripped up this session once; now documented so it doesn't
  again.

## Recommendation for the new architect's first move

Read the round-2 synthesis report in full (it's the authoritative Slice 3.0c-4.5 plan,
Owner Decision Memo, and Security Invariants), then read this file's "Still open" section
above, then decide whether to proceed straight to Slice 3.3 (tenancy) or revisit anything
Slice 3.2 touched. Slice 3.3 is the natural next step per the existing plan and is not
blocked on anything except normal implementation time.

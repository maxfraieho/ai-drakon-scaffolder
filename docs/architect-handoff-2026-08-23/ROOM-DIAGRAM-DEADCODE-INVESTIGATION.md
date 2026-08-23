# RoomDO / DiagramSyncDO — Frontend-Caller & Dead-Code Investigation

**Date:** 2026-08-23
**Repo:** ai-drakon-scaffolder @ commit `276413de` (main, confirmed up to date at investigation start)
**Trigger:** Coordinator claimed `grep -r` under `src/` found ZERO references to `/ws/room/` or diagram-sync WebSocket connection code, calling into question whether Slice 3.3's tenant-scoping work for both `RoomDO` and `DiagramSyncDO` is protecting a real feature or dead scaffolding.
**Method note:** Task instructed delegating this investigation via `agy -p ... --mode=plan` on AGY3 (192.168.3.234). That invocation timed out after 170s with no partial output or file written (confirmed via `git status --short` — nothing staged). Per the task's own fallback instruction, the investigation below was done directly via SSH/grep/git on the same host.

---

## Bottom line (read this first)

**The coordinator's "zero references" finding is WRONG for `DiagramSyncDO` and RIGHT for `RoomDO`.** The two Durable Objects are not in the same situation and should not be treated identically:

- **`DiagramSyncDO` (`/v1/diagram/:diagramId/sync`) has a confirmed, real, currently-wired frontend caller** — `src/components/drakon/DrakonEditor.tsx` imports `yjs` and `y-websocket`, and opens a `WebsocketProvider` pointed at exactly this route (line 227, URL built at line 225). This is real collaborative-editing code (cursor awareness, comments, diagram-state broadcast), not a stub. It is gated behind a `VITE_USE_REALTIME_SYNC === 'true'` feature flag that is **not set anywhere** in tracked config (`.env`, `.env.example`, `wrangler.toml`, CI workflows) — so it is currently **dormant by default**, not deleted or unreferenced.
- **`RoomDO` (`/ws/room/*`) genuinely has zero frontend callers anywhere in `src/`.** No `new WebSocket(`, no literal `/ws/room`, no case-insensitive `\broom\b` match outside one unrelated CSS comment ("control-room aesthetic").
- **This exact question has already been answered, independently and more thoroughly, by a same-repo report written yesterday**: `docs/reports/2026-08-23-openbot-verifier-final-synthesis.md`. That report found `/ws/room/*` is **live** in production right now (Durable Object `ROOM_DO` is bound on the deployed Worker, dispatched before any auth check) and that `/v1/diagram/*/sync` currently 500s live only because the `DIAGRAM_SYNC` binding is **absent from the authoritative wrangler config** — not because nothing calls it. That report explicitly states: *"The frontend (`DrakonEditor.tsx:225`) actively opens a WebSocket to exactly this route for collaborative diagram sync — if the live deployment matches the committed config, real-time diagram collaboration is broken in production right now."* This corroborates my independent grep finding via a different investigation, on a different day, with the same file:line citation.

The likely reason the coordinator's grep missed this: the real code uses `new WebsocketProvider(...)` from the `y-websocket` library, not a literal `new WebSocket(...)` call. A search for the literal string `new WebSocket(` (which I also tried first) returns nothing in `src/`; only a broader search for `yjs`, `y-websocket`, or the `/v1/diagram/.../sync` URL-template pattern surfaces it.

---

## (1) Frontend-caller status — exact evidence

### DiagramSyncDO — HAS a live frontend caller

```
$ grep -rn 'Yjs\|yjs' src/
src/components/drakon/DrakonEditor.tsx:73:import * as Y from 'yjs';
src/components/drakon/DrakonEditor.tsx:382:    // Broadcast via Yjs

$ grep -n "WebsocketProvider\|import \* as Y from 'yjs'" src/components/drakon/DrakonEditor.tsx
73:import * as Y from 'yjs';
74:import { WebsocketProvider } from 'y-websocket';
216:const wsProviderRef = useRef<WebsocketProvider | null>(null);
227:  const provider = new WebsocketProvider(wsUrl, diagramId, ydoc);

$ grep -rniE 'diagram.{0,20}sync' src/
src/components/drakon/DrakonEditor.tsx:225:  const wsUrl = `${import.meta.env.VITE_WORKER_URL || 'https://drakon-antigravity-worker.maxfraieho.workers.dev'}`.replace(/^http/, 'ws') + `/v1/diagram/${diagramId}/sync`;

$ grep -rln 'yjs' --include=package.json .   # (excluding node_modules)
./package.json    # line 83: "yjs": "^13.6.31",  line 82: "y-websocket": "^3.0.0"
```

Full context (`src/components/drakon/DrakonEditor.tsx:214-232`):

```
// Task-V2-09b: Realtime Sync (Cloudflare DO)
const yDocRef = useRef<Y.Doc | null>(null);
const wsProviderRef = useRef<WebsocketProvider | null>(null);

useEffect(() => {
  if (import.meta.env.VITE_USE_REALTIME_SYNC !== 'true') return;
  if (!diagramId || isNew) return;

  const ydoc = new Y.Doc();
  yDocRef.current = ydoc;

  const wsUrl = `${import.meta.env.VITE_WORKER_URL || 'https://drakon-antigravity-worker.maxfraieho.workers.dev'}`.replace(/^http/, 'ws') + `/v1/diagram/${diagramId}/sync`;

  const provider = new WebsocketProvider(wsUrl, diagramId, ydoc);
  wsProviderRef.current = provider;
  ...
```

Plus real awareness (cursor presence) handling, a `yDiagram.observe(...)` for incoming CRDT state, and (line 383) a `pushEdit` broadcast that writes local edits into the Yjs doc — all gated by the same flag. This is a complete, non-trivial feature (cursor colors, guest IDs, comments map), not a leftover stub.

**The gating flag `VITE_USE_REALTIME_SYNC` is set nowhere in tracked config** — checked `.env`, `.env.example`, `cloudflare-worker/wrangler.toml`, root `wrangler.toml`, and `.github/workflows/*.yml`. It only appears inside `DrakonEditor.tsx` itself (3 guard sites: lines 160, 219, 383). This means: in any build using only tracked config, the WebSocket connection is never opened. Whether it's turned on via an untracked local `.env` or a Cloudflare Pages dashboard env var (not visible from the repo) could not be verified from this host.

### RoomDO — has NO frontend caller anywhere in `src/`

```
$ grep -rn '/ws/room' src/        → (no matches)
$ grep -rn 'new WebSocket(' src/  → (no matches)
$ grep -rn 'RoomDO' src/          → (no matches)
$ grep -rniE '\broom\b|ws/room|room_do|roomdo' src/
src/styles.css:9:     • Precision Dark — control-room aesthetic.   ← unrelated CSS comment, false positive
```

No other client code exists in the repo (checked `services/*` — none are frontend/mobile clients; no mobile app directory found).

### Note on `.lovable/` — a prior deploy-source ambiguity, now resolved

There is a standing operator memory note ("Cloudflare builds from `.lovable/`") that made me check whether the real production build source might be a separate `.lovable/src/` mirror rather than `src/`. This was true under **ADR-0006** (accepted 2026-08-18: *"Cloudflare Pages збирає застосунок із `.lovable/`"* — mirror-sync build contract). **It is no longer true.** Commit `e0f1a779` (2026-08-20, "chore(phase0): collapse .lovable/ build-root duplication...") deleted `.lovable/` entirely, made `src/` the single build root, rewrote `package.json`/`tsconfig.json`/`vite.config.ts` to point at root directly, and added `.lovable/` to `.gitignore`. **ADR-0006 was never formally marked superseded** (`superseded-by: null`) despite being contradicted two days later — a documentation gap worth flagging separately, but not this investigation's blocker. Confirmed: `.lovable/src/components/drakon/DrakonEditor.tsx` does not exist on disk; `wrangler.toml` (`pages_build_output_dir = "dist"`) and `package.json`'s `build` script (`vite build && ...`) both operate on root `src/`. **`src/` is the correct and current place to search for frontend callers**, which is what the coordinator did — the miss was in search pattern, not search location.

---

## (2) Git history — when/why RoomDO and DiagramSyncDO were added

```
$ git log -S'class RoomDO' --oneline -- cloudflare-worker/worker-mcp-drakon.js
56897b2c feat(realtime): add RoomDO Durable Object and WebSocket handling for multi-user sync (TASK-V2-09a)

$ git log -S'class DiagramSyncDO' --oneline -- cloudflare-worker/worker-mcp-drakon.js
c87389a9 feat(realtime): implement cloud-only diagram sync via Cloudflare Durable Objects and Yjs
```

**`56897b2c`** (2026-06-30 17:17:57 +0300) — "feat(realtime): add RoomDO Durable Object and WebSocket handling for multi-user sync (TASK-V2-09a)". Small commit: +62 lines in the worker file, +8 in `wrangler.toml`, +1 in TASKS.md. Commit subject is the entire message (no body). This is task-tracked (TASK-V2-09a), i.e. planned work, not an ad-hoc experiment — but it landed with no frontend consumer in the same commit.

**`c87389a9`** (2026-07-01 10:23:27 +0300) — "feat(realtime): implement cloud-only diagram sync via Cloudflare Durable Objects and Yjs". Large commit (159 files, 961 insertions) that added `DiagramSyncDO` to the worker **and simultaneously wired the frontend**: `src/components/drakon/DrakonEditor.tsx` (+89 lines), `src/types/drakonwidget.d.ts`, plus the (now-deleted) `.lovable/` mirror copies of the same files. A follow-up commit the next day, **`c5637e3a`** (2026-07-01 11:27:34, "feat(realtime-ui): implement cursor presence and comments in EVIDENCE drawer, TASK-V2-09c") extended the same Yjs channel with cursor-presence/comments UI — this is the `VITE_USE_REALTIME_SYNC` gate and awareness code seen above.

So: **`DiagramSyncDO` was built together with its frontend caller in one commit, then extended the next day** (TASK-V2-09a → 09b → 09c, a coherent 3-part task sequence: DO scaffold → sync wiring → presence UI). `RoomDO` was added as step 09a's DO half but — as far as `git log --follow` on `DrakonEditor.tsx` and repo-wide `RoomDO` grep show — **never got a corresponding frontend step**. It looks like `RoomDO` was intended as reusable general-purpose plumbing (a generic broadcast relay, per the worker's own code comment) that the 09b/09c frontend work ended up not needing, because Yjs's CRDT sync (via `DiagramSyncDO`) already covered the collaborative-editing use case end-to-end.

---

## (3) ADR / doc context on collaborative-editing scope

**`docs/adr/0018-appwrite-cloudflare-responsibility-split.md`** (line 38) states the intended architecture explicitly:

> **Durable Objects**: realtime collaboration only (`RoomDO`, `DiagramSyncDO`).

This confirms both classes were a **deliberate, documented architectural decision**, not accidental scaffolding — the ADR groups them together as one purpose ("realtime collaboration"), which matches what the code shows: `DiagramSyncDO` is the one actually used for that purpose today, and `RoomDO` appears to be either (a) generic infrastructure for a not-yet-built second collaboration surface, or (b) redundant with `DiagramSyncDO` and never pruned after Yjs made it unnecessary. The ADR does not distinguish between the two or explain why both exist.

No ADR search for "room"/"collaborat"/"Yjs" surfaced any ADR describing a *planned but unbuilt* feature that would need `RoomDO` specifically — ADR-0004 and ADR-0018 were the only other hits, and both are incidental (ADR-0004 is about MemPalace's "wings/rooms/drawers" memory metaphor, unrelated to `RoomDO`).

**Most directly relevant: `docs/reports/2026-08-22-phase3-worker-architecture-decision.md`** (independent prior investigation, day before this one) already recommended extracting `RoomDO` + `DiagramSyncDO` together as "Cluster 1" into a dedicated Worker:

> **First extraction candidate: Cluster 1 (RoomDO + DiagramSyncDO, real-time collaboration/sync, ~115 lines)** — zero coupling to the rest of the file ... a distinct runtime paradigm (stateful Durable Objects vs. the rest of the file's stateless HTTP), lowest blast radius.

and separately documented the exact live/broken state:

> **`DIAGRAM_SYNC` binding is absent from the authoritative config** → `GET /v1/diagram/:id/sync` returns `500 DIAGRAM_SYNC binding missing` per the committed config. The frontend (`DrakonEditor.tsx:225`) actively opens a WebSocket to exactly this route for collaborative diagram sync — if the live deployment matches the committed config, real-time diagram collaboration is broken in production right now.

**Most important: `docs/reports/2026-08-23-openbot-verifier-final-synthesis.md`** — written the same day as this investigation, already treats this as a resolved, critical, live-security finding (not a "is this dead code" question at all):

- **N1 (Critical, DIRECT_SOURCE):** `/ws/room/*` and `/v1/diagram/*/sync` are dispatched at Worker lines 2641/2653, before the try block, before `JWT_SECRET` checks, before any auth call — straight into `RoomDO.fetch`/`DiagramSyncDO.fetch`, both requiring only an `Upgrade: websocket` header, zero auth, zero tenant binding. `ROOM_DO` **is bound on the live Worker** — so `/ws/room/*` is live and reachable by anyone who guesses a room id (`idFromName(pathSegment)` — guessable by construction) right now.
- **N2 (High, inference):** `/v1/diagram/*/sync` currently 500s live only because `DIAGRAM_SYNC` isn't bound in the *live* config. Fixing that config gap (a separate slice, "3.0c") would **activate a second unauthenticated WebSocket surface** the moment it ships — unless the auth-gating slice (3.6) lands with or before it.
- This report is the origin of **Slice 3.6** ("WebSocket / Durable-Object authentication and tenant binding") in the current plan, explicitly created because of this finding, and explicitly sequenced to land before or with the config fix (3.0c) that would otherwise re-expose `DiagramSyncDO`.
- It lists this as a **newly-triggered security-invariant violation (SC-3)**: *"A security invariant is violated on the live edge... independent of SC-1 (deploy defect) and SC-2 (test-coverage gap) — it is a source defect."*
- Open question **Q-12** in that report, still unresolved as of its writing: *"`/ws/room/*` is a live unauthenticated WebSocket (N1). Fix it out-of-band now, or hold it in sequence behind 3.0c/3.1?"*

**Conclusion of this section:** the "is this dead code" question was already asked and answered by a report written earlier the same day as this investigation, with more direct evidence (live Worker config bindings, exact dispatch line numbers) than either the coordinator's grep or this investigation had. It found `/ws/room/*` live and dangerous today, and `/v1/diagram/*/sync` one config change away from being equally live and dangerous, with a real frontend already built and waiting to talk to it.

---

## (4) `docs/reports/2026-08-23-openbot-verifier-final-synthesis.md` and other reports — direct mentions

Covered in full above (section 3). Additionally, `docs/reports/2026-08-23-openbot-harnessadapter-revised-plan.md` (fact **L1**) independently confirms the live-binding state from a Cloudflare API read done in a prior session:

> Live `drakon-antigravity-worker`: `compatibility_date 2024-01-01`, no flags, DO `ROOM_DO` only. **No D1. No service bindings. No AI binding. No `DIAGRAM_SYNC`.** Live matches no single config file.

This is a third independent source (direct Cloudflare API read, not just repo grep) confirming: `ROOM_DO` is live-bound (so `/ws/room/*` is reachable in production today), `DIAGRAM_SYNC` is not (so `/v1/diagram/*/sync` 500s in production today, despite the frontend code trying to reach it).

---

## Recommendation

**(a) — Proceed with Slice 3.3's tenant-scoping for both `RoomDO` and `DiagramSyncDO`, treating both as real attack surface, unmodified from the current plan.** This is not a defense-in-depth judgment call — it is already settled by direct evidence, three independent sources deep:

1. `RoomDO`/`/ws/room/*` is **live in production right now**, unauthenticated, and reachable by anyone who guesses a room id. This is true regardless of whether any current frontend calls it — an attacker doesn't need your frontend to hit a public WebSocket URL. Zero frontend usage does not reduce this risk; if anything it means there is no legitimate traffic pattern to distinguish from an attack.
2. `DiagramSyncDO`/`/v1/diagram/*/sync` **has a real, built frontend caller** (`DrakonEditor.tsx`, three-commit TASK-V2-09a/b/c sequence, full Yjs CRDT + cursor-presence + comments implementation) that is currently dormant only because (i) a feature flag defaults off in tracked config, and (ii) the live Worker config is missing the `DIAGRAM_SYNC` binding. **Both of those are one config change away from being live**, and the existing plan already identifies that the binding fix (Slice 3.0c) and the auth-gating fix (3.6) must land together or the fix itself creates the second hole. Descoping tenant work here would leave a real, soon-to-be-activated collaboration feature with zero tenant isolation.
3. The coordinator's premise — "nothing calls this, maybe we're protecting dead code" — is empirically false for `DiagramSyncDO` and only true for the sub-question of whether the *DO itself* has a UI trigger in `src/`, which was never the right test for whether Worker-level auth work is warranted. The right test (is this route reachable/dispatched in the live Worker) already returned yes, twice, from two prior independent reports.

**One real distinction worth carrying forward, not for descoping but for prioritization:** `RoomDO` has no frontend feature depending on it at all — it may be candidate for deletion (nothing depends on it; it looks like leftover 09a scaffolding that 09b/09c's Yjs approach made unnecessary) rather than tenant-scoping. That's a separate decision from Slice 3.3/3.4, and per Chesterton's Fence should not be acted on unilaterally — nobody in this investigation or the prior reports found a comment or ADR explaining why `RoomDO` was kept separate from `DiagramSyncDO`, so "delete it" is a proposal for Q, not a unilateral action. Removing it would also shrink Slice 3.6's scope (one fewer DO to gate) if Q chooses to do it before 3.6, or it could be left alone and gated identically to `DiagramSyncDO` if Q prefers not to touch it mid-sprint. Either way, **it should not be descoped from the *security* work** — an unused-by-frontend DO that is live and unauthenticated is still live and unauthenticated.

**What should change, if anything:** not the tenancy work itself, but two small process notes for whoever picks up Slice 3.3/3.4:
- Re-verify `VITE_USE_REALTIME_SYNC` is genuinely unset in the actual Cloudflare Pages dashboard build env (not just tracked repo config) before assuming the frontend caller is fully inert — this investigation could not check dashboard-only env vars from this host.
- ADR-0006 should be marked `superseded-by` (referencing commit `e0f1a779`'s "collapse .lovable/" change) — it currently claims Cloudflare Pages builds from `.lovable/`, which has been false since 2026-08-20 and could mislead a future investigator the way it nearly misled this one.

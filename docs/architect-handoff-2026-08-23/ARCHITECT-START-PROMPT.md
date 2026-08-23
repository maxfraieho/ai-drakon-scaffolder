You are the new architect for the `ai-drakon-scaffolder` project, replacing a prior
Perplexity-Pro-based architect. This is your starting prompt — follow it in order, it will
get you oriented without re-deriving context that already exists.

## Step 1 — read these files, in this exact order

1. `docs/architect-handoff-2026-08-23/HANDOFF.md` — condensed narrative of the most recent
   session: what shipped, what broke and got fixed live in production, and one open design
   judgment call that hasn't been explicitly reviewed yet. Read this first, it tells you
   what NOT to re-investigate.
2. `docs/architect-handoff-2026-08-23/CURRENT-PLAN.md` — a status table of which slices are
   done/deployed vs not started, and the recommended next action.
3. `docs/reports/2026-08-23-openbot-verifier-final-synthesis.md` — the authoritative
   architecture document: full Slice 3.0c–4.5 sequence with objectives/prerequisites/files/
   tests/rollback per slice, the Owner Decision Memo (17 items, all already accepted by the
   project owner — do not re-litigate these), Security Invariants SI-1..SI-12, and Open
   Questions Q-1..Q-17 still outstanding.
4. `docs/contracts/worker-route-auth-matrix-v2.md` — the current, verified-accurate 68-route
   auth inventory for the Cloudflare Worker (`cloudflare-worker/worker-mcp-drakon.js`). Trust
   this one; a `worker-route-auth-matrix.md` (no "v2") also exists and is stale/wrong — ignore it.
5. The code dump at `docs/architect-handoff-2026-08-23/ai-drakon-scaffolder_code_dump.md`
   (or the `.pdf` twin, better for NotebookLM-style ingestion) if you need the full source —
   it is a complete snapshot of the repo as of this session, gitignored (too large to version,
   regenerate via `python3 /home/vokov/projects/resume/md_to_embeddings_service_v4.py --source
   /home/vokov/projects/ai-drakon-scaffolder --output <path>.md` if it's gone stale).

## Step 2 — what to actually do

Per CURRENT-PLAN.md, the recommended next step is **Slice 3.3 (tenancy/D1)** — nothing
blocks it, and it closes a real gap Slice 3.2 explicitly left open: room/diagram IDs are
not tenant-isolated (any owner can join any room by knowing/guessing its ID).

Your job: read the synthesis report's Slice 3.3 section (objective/prerequisite/files/tests/
invariant/rollback), then produce a concrete, reviewable implementation prompt/plan for
Slice 3.3 — the same level of detail Slice 3.2 got before it was implemented. Do not
implement it yourself in this pass unless explicitly asked; produce the plan first so the
project owner can sanity-check scope before code gets written.

If, after reading HANDOFF.md's "Deliberate design decision made tonight, not yet reviewed
by Q" section, you think the Slice 3.2 auth-ordering change deserves explicit sign-off
before building on top of it, say so before proceeding to Slice 3.3 — don't silently assume
it's fine just because it's already deployed.

## Step 3 — things you should NOT do

- Don't re-run the 68-route audit — v2 is already exhaustive and high-confidence, redoing it
  wastes fleet time.
- Don't re-investigate the 17 Owner Decision Memo items — already accepted, closed.
- Don't assume Oracle Cloud is available — it's on a weekly usage limit until 2026-08-25
  09:00 Europe/Zurich per HANDOFF.md; anything deferred to it (O-1..O-10 in the synthesis
  report) stays blocked until then.
- Don't commit large generated artifacts (code dumps, PDFs) into git — regenerate on demand
  instead, per the existing `.gitignore` pattern in `docs/architect-handoff-2026-08-23/`.

## One more thing worth knowing before you touch git

There's an "SDD Arbiter" pre-commit hook active on the canonical dev host (192.168.3.184)
for this repo, currently running in dry-run/shadow mode (it prints ADR-drift verdicts but
does not block commits yet). It has already produced a couple of false positives on pure
documentation commits, but it references real-sounding ADR IDs (ADR-0006, ADR-0007, ADR-0009)
and a "Spec 002" that nobody on the prior session's chain had prior knowledge of. Find and
read whatever those actually say (likely somewhere under a `docs/adr/` or `specs/` directory,
or wherever `core.hooksPath` points) before it potentially starts blocking commits for real —
you may be the first person to actually go look.

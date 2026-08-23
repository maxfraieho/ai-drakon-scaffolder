# ADR/SDD System — History and Enforcement Status

**Investigated:** 2026-08-23, directly via SSH (`vokov@192.168.3.234`) against
`/home/vokov/workspace/ai-drakon-scaffolder` on `main`, HEAD `276413dee86916b229e47f5c028243983ce42ec`
("docs: starter prompt for new architect (Slice 3.3 kickoff)").

`agy -p ... --mode=plan` (headless, `~/.local/bin/agy`) was attempted first per host convention
and **timed out** ("Error: timeout waiting for response", exit code 0, no usable output). Per the
task's fallback instruction, this investigation was completed directly via SSH (`cat`/`find`/`sed`/`curl`
to the public GitHub REST API — no `gh` CLI is installed on this host and none was needed; the
GitHub API is reachable unauthenticated for this repo's public read endpoints, HTTP 200).

---

## 1. Origin/purpose — why the ADR/SDD system exists

Source: `docs/handoff/2026-08-18-sdd-adr-integration-research.md` (read in full, 191 lines).

This is a **research report and recommendation**, dated 2026-08-18, produced in **READ-ONLY analysis
mode** (no commits) — i.e. it was a proposal document, not itself the decision. It diagnoses
`ai-drakon-scaffolder` as being in a "brownfield trap": code and experiments (DRAKON generation,
OrangePi/RPi agent fleet, Cloudflare Workers, Appwrite) evolved in parallel while documentation
fragmented into incompatible, partly-empty formats, with a single `MASTER-CONTEXT.md` file holding
undocumented architectural decisions at risk of being silently violated during refactors.

Direct quotes:

> "Проєкт `ai-drakon-scaffolder` опинився в типовій brownfield-пастці: код та функціонал
> створювалися паралельно з різними експериментами ..., але документація розпалася на кілька
> несумісних форматів"

> "Невикористаний капітал архітектурних рішень: У `MASTER-CONTEXT.md` уже зафіксовані ключові
> рішення у вигляді структурованої таблиці, але вони не мають статусу ADR і ризикують бути
> втраченими або порушеними під час подальшого рефакторингу."

> "Проєкт готовий до безболісного та швидкого переходу на `sdd-universal-template`. Це не
> переписування з нуля, а впорядкування наявного знання з фіксацією критичного шляху."

The recommended methodology base is `sdd-universal-template` (Copier scaffold) implementing
**MADR v3.x**, **Doubt-Driven Development** (every baseline claim must cite `file:line`), and
**Two-Speed SDD** (legacy bugfix/refactor trajectory vs. full spec→plan→tasks→TDD trajectory for
new features). Proposed rollout was a 4-phase, **3–5 day** plan:

- Phase 1: `copier copy` template with `enable_adr: true`; generate retroactive ADR-0001..0004 from
  the `MASTER-CONTEXT.md` decision table (Appwrite, Cloudflare Workers, GitNexus, MemPalace).
- Phase 2: Characterization/Golden-Master tests around the critical codegen path
  `src/lib/codegen/codegenApi.ts:47-96` (`generateDrakonCode`), plus a Chesterton's-Fence ban on
  touching the `.lovable/src/` sync mechanism without understanding it.
- Phase 3: Two-Speed adoption — legacy fixes via `/sdd:bugfix`/`/sdd:refactor` against baseline
  tests; new features via full `/sdd:feature` cycle. Multi-agent (OrangePi Alpha / rpi3b Beta)
  coordination moves onto `.specify/feature.json` + `docs/for-agents/agent-fleet.md`.
- Phase 4: debt cleanup (delete empty doc stubs) + `bin/sdd_verify.sh --gate` as an automated gate
  for unclosed tasks / unvalidated ADRs.

> "**Загальний масштаб:** 1 робочий тиждень (3–5 днів) для одного розробника/оператора з AI-агентом.
> Це НЕ місячна робота."

**Who/what decided to add it:** the document itself does not name a human decision-maker — it is an
AI-agent-authored research/recommendation report ("Режим аналізу: READ-ONLY"). It functioned as the
proposal; actual adoption is evidenced by the repo now containing `docs/adr/0001`–`0025`,
`.specify/`, `specs/000`–`004`, `bin/sdd_verify.sh`, and the two CI workflows described below — i.e.
the recommendation was accepted and implemented sometime after 2026-08-18, ahead of tonight
(2026-08-22/23) but clearly **actively growing tonight** (ADR count grew well past the 4 originally
scoped; latest ADR is `0025-tenancy-boundary.md`).

---

## 2. Docs/ADR audit — findings, gaps, rollout status

Source: `docs/handoff/2026-08-18-docs-adr-audit.md` (read in full, 268 lines), same date as the
proposal above — this looks like a companion/follow-on document, not a later check-in.

Header states scope and a caveat about its own tooling:

> "Стан: гілка `main`, commit `47511aaa`. Обсяг: 247 Markdown-файлів поза `docs/adr/`, `specs/`,
> `node_modules/`, `.lovable/`, `services/*-flue/`. GitNexus `query()` викликано, але MCP повернув
> `Transport closed`; твердження про `src/` перевірено прямим читанням."

So the audit's own GitNexus MCP call failed mid-audit (`Transport closed`) and it fell back to
direct file reads for `src/` claims — a real methodology caveat on this document's completeness.

Summary numbers:

> "Файлів: 247 / МADR-кандидатів: 14 / Кандидатів без покриття ADR 0001–0009: 9 / Застарілих: 95"

i.e. at audit time (2026-08-18) only **ADR 0001–0009** existed (vs. 25 today), 95 of 247 docs were
found to be stale/empty stub files (`docs/agents/agy/*`, `docs/architecture/*`, `docs/concept/*`,
`docs/plans/2026-05-*`, etc. — recommendation "видалити" for all of them), and 9 files described
real architectural decisions with **no** corresponding ADR yet.

Confirmed drift/gaps flagged directly:

> "Confirmed drift: `src/routeTree.gen.ts` і `.lovable/src/routeTree.gen.ts` не ідентичні;
> `src/routes/tutorial.tsx` існує. `HANDOFF.md` посилається на відсутні файли.
> `docs/wiki/06_deployment_ci_cd.md:40` посилається на `feature/astryx-ui`, checkout — `main`."

Notably, the audit's own table includes a row for the *other* handoff doc (item 1 above), showing
it was already stale one day after being written:

> `docs/handoff/2026-08-18-sdd-adr-integration-research.md` | MADR-кандидат | 0001–0009 |
> "Посилання на відсутній `MASTER-CONTEXT.md`; прогнозує 4 ADR, фактично існують 0001–0009." |
> "оновити як ADR index/source map"

**Was the system "fully rolled out" per this audit?** No — explicitly not. The audit is itself a
punch list of ~9 missing-ADR gaps plus 95 stale files to delete plus dozens of "оновити" (update)
items across `docs/wiki/*`, `AGENTS.md`, `CONTEXT.md`, agent-fleet docs, etc. It does not contain a
"rollout complete" statement anywhere; it ends on a methodology/scope note, not a completion
verdict:

> "## Методика та межі — MADR-кандидат = рішення з альтернативами, довгим впливом або новими
> інваріантами. Reference не конвертувати в ADR. Empty `-`/`#` files = stale placeholders. Повну
> code-claim перевірку повторити через GitNexus `query()`/`context()` після відновлення MCP
> transport."

That last line is itself an open, never-explicitly-closed action item — re-run full code-claim
verification via GitNexus once the MCP transport issue is fixed.

---

## 3. `scripts/adr-immutability-check.sh` — what it does, when it runs

Read in full (89 lines). Purpose per its own header:

> "ADR Immutability Check — blocks modification of accepted/deprecated/superseded ADR files.
> Allows ONLY changes to the 'superseded-by' frontmatter field."

Logic:
- Determines the changed-file set two ways: from `$@` args (CI-style) or, if no args, from
  `git diff --cached --name-only --diff-filter=M -- 'docs/adr/0*.md'` (pre-commit-hook-style,
  staged diff).
- For each matching ADR file (`docs/adr/0[0-9]{3,4}-*.md`), reads the file's `status:` frontmatter
  **as of `HEAD`** (not the working copy).
- If status is `accepted*`, `deprecated*`, or `superseded*`, it diffs the file (staged, or against
  `$DIFF_BASE` if set) and strips out `+`/`-` lines that are just the `superseded-by:` field. If
  anything else changed, it **blocks** with `❌ BLOCKED: '<file>' has status '<status>' and is
  immutable.` and sets exit 1.
- Separately does the same check for matching `docs/adr/assets/0*.svg` diagram assets, mapping the
  SVG's leading 4-digit number back to its ADR file and status.
- On any block, prints a pointer: `💡 ADR immutability rule: ... See ADR-0015 for details.`

**Invocation — confirmed both ways, directly from the repo:**
1. **Local pre-commit hook**, `.git/hooks/pre-commit`:
   ```
   #!/usr/bin/env bash
   # Auto-installed by scripts/install-hooks.sh
   bash scripts/adr-immutability-check.sh
   ```
   No args → staged-diff mode. This is a **local, per-clone** hook (installed by
   `scripts/install-hooks.sh`) — it only fires if that installer was run on a given machine/clone;
   it is not committed as an enforced repo-wide hook by itself.
2. **CI**, `.github/workflows/adr-guard.yml` ("ADR Immutability Guard" — see §4), which invokes it
   with an explicit changed-file list and `DIFF_BASE` set to the PR/push diff range.

I could not find any invocation of `adr-immutability-check.sh` from a script named or referred to as
an "SDD Arbiter" anywhere in the repo (`grep -rln 'arbiter|Arbiter'` only matches `bin/sdd_verify.sh`).
`bin/sdd_verify.sh --arbiter` mode is documented in its own header as:
> "--arbiter  Run scripts/sdd_llm_judge.py --staged (LLM pre-commit judge), if that script exists yet."

**`scripts/sdd_llm_judge.py` does not exist in this checkout** (`ls` confirms: no such file). So the
LLM-judge "SDD Arbiter" referenced by `bin/sdd_verify.sh --arbiter` is a **planned/scaffolded mode
with no implementation present on `main` at HEAD `276413de`** — it is not what
`adr-immutability-check.sh` is. If a working "SDD Arbiter" pre-commit hook was seen producing a
verdict referencing "Spec 002" tonight, it either lives in an uncommitted local hook on whatever
machine that was run on, or in a branch/commit not yet on `main` in this clone — this is a real gap
in what I could verify and should be chased down with whoever ran that hook tonight.

---

## 4. `.github/workflows/adr-guard.yml` — CI behavior, and did tonight's pushes trigger a failure

Read in full (26 lines):

```yaml
name: ADR Immutability Guard

on:
  pull_request:
    paths:
      - 'docs/adr/**'
  push:
    paths:
      - 'docs/adr/**'

jobs:
  adr-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check ADR immutability
        run: |
          BASE_REF="${{ github.event.pull_request.base.sha || 'HEAD~1' }}"
          CHANGED=$(git diff --name-only "$BASE_REF"...HEAD -- 'docs/adr/0*.md' 'docs/adr/assets/0*.svg' 2>/dev/null || git diff --name-only HEAD~1 -- 'docs/adr/0*.md' 'docs/adr/assets/0*.svg' 2>/dev/null || true)
          if [ -n "$CHANGED" ]; then
            DIFF_BASE="$BASE_REF...HEAD" bash scripts/adr-immutability-check.sh $CHANGED
          else
            echo "✅ No ADR files modified."
          fi
```

**This workflow is path-filtered to `docs/adr/**` only** — it does NOT run on every push/PR, only
on pushes/PRs that touch files under `docs/adr/`. This was verified directly against GitHub's
Actions API (`GET /repos/maxfraieho/ai-drakon-scaffolder/actions/runs`, unauthenticated, HTTP 200):
its most recent run was against commit `73e0fbd682` (2026-08-22 15:24:40Z) and it **succeeded**
(`conclusion: success`). It has **not run at all** on any commit since, including tonight's Slice
3.1/3.2/3.6 work and the `276413de` architect-handoff docs commit — consistent with those commits
not touching `docs/adr/**`. So for this specific workflow, the answer is: **it did not silently
fail tonight — it simply did not run**, by design (path filter), which is expected behavior if
tonight's commits didn't modify ADR files. This was not blocking for tonight's work in the
sense the user was concerned about, but it does mean any ADR files touched tonight as *side effects*
of other work should be double-checked — the guard only fires when `docs/adr/**` is in the diff.

**However — a second, separate, unfiltered workflow exists and is red: `sdd-verify.yml` ("SDD
Verify").** This is the one that actually runs on every push/PR (no path filter):

```yaml
name: SDD Verify

on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SDD structure verification
        run: bash bin/sdd_verify.sh
      - name: Test suite
        run: python3 -m pytest tests/
```

Directly queried via the GitHub API (`GET /repos/maxfraieho/ai-drakon-scaffolder/actions/runs?branch=main`),
the 15 most recent runs of "SDD Verify" on `main` are **ALL `conclusion: failure`**, going back at
least to `44681804a8` (2026-08-19) through and including tonight's HEAD `276413dee8` (run
`32634210482`, completed 2026-08-23T10:36:29Z, **failure**). Every commit in between — including the
Slice 3.1/3.2/3.6 security-refactor pushes and the architect-handoff docs commit — is also red:

```
32634210482  SDD Verify  276413dee8  failure  2026-08-23T10:36:29Z   ← current HEAD
32632546314  SDD Verify  e212ee4241  failure  2026-08-23T10:00:05Z
32631743341  SDD Verify  e8c9097f6b  failure  2026-08-23T09:42:27Z
32631062396  SDD Verify  a44eb02fac  failure  2026-08-23T09:27:46Z
32629962551  SDD Verify  6c809fc663  failure  2026-08-23T09:03:54Z
32628353040  SDD Verify  863985d131  failure  2026-08-23T08:28:27Z   ← "863985d1" from the task (263985d1 typo — actual sha starts 863985d1)
32625418716  SDD Verify  7059707dea  failure  2026-08-23T07:23:02Z
32619152285  SDD Verify  b84176f681  failure  2026-08-23T04:57:43Z
32616125529  SDD Verify  874c479b3a  failure  2026-08-23T03:45:00Z
32592046210  SDD Verify  4004f6aa63  failure  2026-08-22T18:52:45Z
32584590441  SDD Verify  57fe5afac6  failure  2026-08-22T16:24:09Z
32581608281  SDD Verify  73e0fbd682  failure  2026-08-22T15:24:40Z
32231153921  SDD Verify  44681804a8  failure  2026-08-19T08:08:29Z
```

**So: yes — CI has been red on `main` continuously since at least 2026-08-19, including every one of
tonight's pushes and the current HEAD `276413de`. This has apparently gone unnoticed for days, not
just tonight.** Nobody needs to "check whether tonight's pushes broke CI" — CI was already broken
before tonight and has stayed broken through tonight; it did not newly break as a result of the
Slice 3.1/3.2/3.6 work.

**Root cause of the failure (partially verified):** pulling job step detail for the latest run
(`32634210482`, job id `97181420310`) shows:
```
SDD structure verification   → success
Test suite                   → failure   (this is the `python3 -m pytest tests/` step)
```
So `bin/sdd_verify.sh` itself (the ADR/spec structure check) **passes** — the SDD/ADR gate is not
what's red. The failure is in the "Test suite" step. Running `python3 -m pytest tests/` locally on
this host (which has `pytest-9.1.1` pre-installed) **passes cleanly** (4 passed,
`tests/regression/test_mobile_production_bugs.py`). I could **not** fetch the actual GitHub Actions
job log text to see the runner's error (`GET .../actions/jobs/{id}/logs` returned `403` — this
requires an authenticated token, and none is available on this host — no `gh` CLI installed, no
token configured). **Working theory, unverified:** `ubuntu-latest` GitHub runners do not ship
`pytest` pre-installed and the workflow has no `pip install pytest` (or `pip install -r
requirements.txt`) step before running it — this would produce a consistent `python3 -m pytest`
failure (`No module named pytest` / exit 1) on every run regardless of code content, which matches
the observed pattern exactly (100% failure rate, unrelated to what changed). This is a theory, not a
confirmed root cause — recommend someone with a GitHub token pull the actual job log
(`https://github.com/maxfraieho/ai-drakon-scaffolder/actions/runs/32634210482/job/97181420310`) to
confirm.

---

## 5. In-app ADR viewer — `src/lib/adr/`, `src/components/adr/`, `src/pages/AdrPage.tsx`, `src/routes/adr.tsx`

- `src/lib/adr/parser.ts` — parses MADR v3.x frontmatter from ADR markdown files into an
  `AdrRecord` type (`number`, `title`, `status`, `statusRaw`, `date`, `deciders`, `spec`,
  `supersedes`, `supersededBy`, `slug`, `body`), exporting `fetchAllAdrs`/`fetchAdr`/`ADR_FILES`
  used by the two components below.
- `src/components/adr/AdrTimelineView.tsx` — lists/timelines all ADRs with status badges (Astryx
  design tokens: `proposed`/`accepted`/`deprecated`/`superseded`), lets the user pick one.
- `src/components/adr/AdrViewer.tsx` — renders a single ADR's body, with an `ImmutabilityBanner`
  that visibly warns when status is `accepted` (mirroring the immutability rule enforced by
  §3's script) and shows `supersededBy`.
- `src/pages/AdrPage.tsx` — thin page component: shows `AdrTimelineView`, switches to `AdrViewer`
  on selection.
- `src/routes/adr.tsx` — TanStack Router file-route registering `AdrPage` at `/adr`.

**One-sentence purpose:** this is a live, in-app, read-only ADR browser (timeline + detail view)
inside the ai-drakon-scaffolder frontend itself, at route `/adr`, that surfaces the same immutability
rule from `scripts/adr-immutability-check.sh` visually to whoever is using the app.

---

## 6. `specs/` directory — does Spec 002 exist, what does it cover

```
specs/
├── 000-baseline/          spec.md
├── 001-backend-agents-baseline/   spec.md
├── 002-methodology-and-astryx-refactor/   spec.md, plan.md, tasks.md
├── 003-astryx-remediation/        plan.md
└── 004-adr-drakon-integration/    plan.md
```

**Yes, `specs/002-methodology-and-astryx-refactor/` exists**, with `spec.md`, `plan.md`, and
`tasks.md`. Its `spec.md` header:

> "# Spec 002: Методологічна база та Astryx brownfield refactor
>
> ## Мета
> Зафіксувати архітектурні рішення SDD, актуальний GitNexus gate і поетапний перехід frontend на
> Astryx поверх amber AI-DRAKON без зміни чинного codegen API та без розриву production build
> contract.
>
> ## Інваріанти
> - ADR-0006/0007 визначають parity `src/` ↔ `.lovable/src/` і generated route tree.
> - ADR-0008 визначає evidence-based arbiter promotion.
> - ADR-0009 визначає Astryx як canonical UI layer поверх amber identity.
> - Після змін у `src/` дзеркало синхронізується через `rsync -av --delete src/ .lovable/src/`.
> - `generateDrakonCode` і GWT-сценарії baseline spec не змінюються в межах цієї фічі.
>
> ## Межі
> План і tasks деталізовані у [plan.md](plan.md). Backend security tasks T-225–T-229 не
> виконуються в межах поточного Codex-запуску; frontend migration T-230–T-239 залишається
> наступною фазою після Task 1."

**So Spec 002 = "Methodology base + Astryx brownfield refactor."** It formalizes the SDD
architectural decisions and the current GitNexus gate, and scopes the staged frontend migration to
Astryx (the design-system layer referenced throughout `src/components/adr/*` above) on top of the
existing "amber" AI-DRAKON identity — explicitly *without* touching `generateDrakonCode` or breaking
the production build/mirror-sync contract (`rsync -av --delete src/ .lovable/src/`). It explicitly
notes backend security tasks **T-225–T-229 are out of scope** for "the current Codex run," while
frontend migration tasks **T-230–T-239** are deferred to a phase after Task 1. If the "SDD Arbiter"
verdict tonight cited "Spec 002" while judging a Cloudflare Worker security change, that's notable:
Spec 002's own stated boundary says backend security tasks (T-225–T-229) are *not* part of this
spec's current execution — worth reconciling directly with whoever ran that judge, since either the
security work fell under a different, unlisted spec, or the boundary in `spec.md` is stale relative
to what was actually done tonight.

---

## Summary of open items for follow-up

1. **CI is red and has been for days** (`SDD Verify` workflow, `sdd-verify.yml`) — 100% failure rate
   on every run I could see back to 2026-08-19, root-caused-by-theory to a missing `pip install
   pytest` step in `.github/workflows/sdd-verify.yml`, unconfirmed because job logs need an
   authenticated GitHub token this host doesn't have.
2. **`ADR Immutability Guard` (`adr-guard.yml`) did not run tonight** — not a failure, just a
   path-filter (`docs/adr/**` only) not matching tonight's diffs. Confirm no ADR file was touched as
   a side effect of tonight's work without going through this gate.
3. **The "SDD Arbiter" LLM-judge hook referenced by `bin/sdd_verify.sh --arbiter`
   (`scripts/sdd_llm_judge.py`) does not exist in this checkout.** Whatever produced a verdict
   tonight citing "Spec 002" was not this script running from `main` at `276413de` — track down
   where it actually ran from.
4. **Spec 002's stated scope excludes backend security tasks (T-225–T-229)** — reconcile against
   tonight's Slice 3.1/3.2/3.6 Cloudflare Worker security refactor to confirm it was judged under
   the correct spec.

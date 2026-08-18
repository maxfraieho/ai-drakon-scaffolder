---
status: "proposed"
date: 2026-08-18
deciders: "оператор + Codex"
spec: null
supersedes: null
superseded-by: null
---

# 0014. Застосувати SDD/ADR як pilot process для vydra-swiss-survey

## Контекст і формулювання проблеми

`github.com/maxfraieho/vydra-swiss-survey` вже існує на branch `astryx-ui-refactor`. Cloudflare Pages deploy працює; Appwrite status невідомий. У конфігурації можуть бути tokens/keys, тому first-run має починатися з inventory і secret hygiene.

## Рушії рішення

* безпечний brownfield bootstrap;
* GitNexus impact gate до code changes;
* arbiter shadow-mode з вимірюваним baseline;
* ADR discipline для рішень, не для кожної задачі.

## Розглянуті варіанти

* повний SDD scaffold одразу;
* ad hoc feature work;
* lightweight guide без ADR.

## Підсумок рішення

Обрано pilot за чотири кроки:

1. **Bootstrap SDD scaffold.** Clone/select `astryx-ui-refactor`; run Copier `sdd-universal-template` in brownfield mode with ADR enabled; preserve existing files; inspect `.env*`, wrangler/Appwrite config and CI. Treat discovered tokens as secrets: do not print or commit; rotate exposed credentials. Verify Cloudflare Pages build hook and record current deploy evidence. Run Appwrite health/auth/function smoke checks only after identifying project/function IDs.
2. **Baseline ADRs.** Record current frontend/deploy contract, Appwrite boundary, auth/token storage, and any survey data model. Mark unknowns as proposed/open; cite file and line evidence. Do not copy AI-DRAKON ADRs without evidence from pilot repo.
3. **GitNexus reindex + gate.** Run `npx gitnexus analyze` on branch, verify repo/branch/last commit, then query execution flows. Before changing any symbol run `impact(..., direction: "upstream")`; resolve HIGH/CRITICAL findings before edit. Before handoff/commit run `detect_changes()` and review affected processes. Run `bin/sdd_verify.sh --gate` with `.specify/feature.json` matching `astryx-ui-refactor`.
4. **First feature, arbiter shadow-mode.** Choose small survey UI or data-flow feature. Create spec/plan/tasks; write RED test; implement; run project checks. Run `bin/sdd_verify.sh --arbiter` in shadow mode, log PASS/FAIL/skip/timeout and operator verdict, but do not block delivery. Promote only after ADR-0008 baseline: ≥20 real PASS/FAIL verdicts, manual review, false-positive rate <10%, no critical false positive.

### Наслідки

* Добре: existing deployment remains protected while process becomes observable.
* Добре: unknown Appwrite state becomes tracked evidence, not assumption.
* Погано: bootstrap adds setup time before first feature.

## Плюси і мінуси варіантів

### Повний brownfield SDD bootstrap

* Добре: repeatable gates and decisions.
* Погано: requires careful preservation of existing deploy config.

### Ad hoc work

* Добре: fastest first edit.
* Погано: no impact evidence or decision history.

### Lightweight guide

* Добре: lower ceremony.
* Погано: cannot enforce ADR and gate contracts.

## Додаткова інформація

Pilot target: `https://github.com/maxfraieho/vydra-swiss-survey`; branch: `astryx-ui-refactor`. Appwrite first-run status remains unknown until repository config and console/runtime checks are available.

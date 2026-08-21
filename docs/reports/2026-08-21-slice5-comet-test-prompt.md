# Comet Agent — Manual UI Test Prompt (Phase 2 Slice 5)

**Date:** 2026-08-21
**Target:** temporary local dev server, `http://192.168.3.30:19081/`
**Why this port, not 8080:** the app's Lovable/vite config force-binds port 8080 ("sandbox requires port 8080"), but `192.168.3.30:8080` is permanently occupied by the antigravity-claude-proxy admin console (a separate, critical persistent service on that machine — never stop it). A local-only patch to `node_modules/@lovable.dev/vite-tanstack-config/dist/{index.js,index.cjs}` overrides the port to `19081` for this dev session only; this patch is NOT part of the repo and will be lost on the next `pnpm install`. If this URL stops responding, the dev server needs restarting on `.30` (`pnpm dev -- --host`, then re-verify the actual port from its startup log).

This prompt is for Comet's built-in browser agent. Paste it into Comet with `http://192.168.3.30:19081/` reachable from that machine's network.

---

## Mission

Open `http://192.168.3.30:19081/` and test the app as thoroughly as practical in one session, with special focus on a newly-shipped feature: a validator provenance/compatibility badge in the diagram editor's Validation panel (Phase 2 Slice 5). Report findings — don't just click through silently.

## Part 1 — General smoke test

1. Load the root URL. Confirm the page title is "AI-DRAKON | Visual Programming" and the top nav bar renders with links: Схеми (`/diagrams`), NotebookLM (`/notebooks`), Pipelines (`/pipelines`), Агенти (`/agents`).
2. Open the browser's JS console (or note if Comet can surface console errors). Note any red errors or uncaught exceptions during initial load.
3. Click through each top-nav link once. Confirm each route loads without a blank page or visible error boundary.
4. Toggle the theme button (moon/sun icon, top-right, `data-testid="clean-view-theme-btn"`). Confirm the page visibly switches between dark and light and nothing looks broken (unreadable text, invisible borders) in either mode.

## Part 2 — Validator provenance/compatibility badge (Slice 5, the main target)

This feature lives inside the diagram editor's collapsible "Validation" panel (a small button usually near the top of the editor, showing a shield/checkmark icon and the word "Validation").

1. Navigate to `/diagrams` and open any existing diagram, or create a new one if none exist. You need a diagram loaded in the editor for validation to run.
2. Locate the "Validation" button/panel. Click it to expand.
3. Either wait ~3 seconds after any edit (auto-validate) or click "Validate now" to trigger validation manually.
4. After validation completes, look for a **small badge next to "Validation" showing one of: `compatible`, `adapted`, or `divergent`** (lowercase, lives right after the existing error/warning count badges, before the chevron). This is the new element — `data-testid="validator-compat-badge"`.
   - Report which state you see.
   - Hover over the badge (or long-press on touch) and report the tooltip text — it should explain whether the runtime/worker validator agrees with the canonical validator, and for `adapted`/`divergent` states, how many issues are only-in-canonical vs only-in-runtime.
5. Try to produce each of the three states if you can, by editing the diagram:
   - A clean, fully valid diagram should show `compatible`.
   - Deliberately break something minor (e.g. leave a question/case node with only one branch) to try to trigger `adapted`.
   - If you can find a way to make validation fail outright (e.g. delete all nodes, or make a node point to a non-existent id), check whether the badge still renders sensibly (don't force a crash — if the UI errors out, stop and report that as a bug, don't keep retrying).
6. If any error/warning issues are listed below the toolbar, confirm each shows an issue code (monospace, e.g. `DANGLING_POINTER`) and a message. Click a node-id reference if present and confirm it copies to clipboard (toast should say "Node ID copied").
7. If a "Preview fixes (N)" button appears (only shows when autofixes exist), click it and report what the autofix list shows — this UI existed before but was previously always empty; confirm it now shows real content when applicable.

## Part 3 — Report back

Provide:
- Pass/fail for Part 1's four checks.
- For Part 2: which compatibility states you managed to observe, the exact tooltip text for each, and a screenshot of the badge in both light and dark theme if possible.
- Any console errors encountered, with the exact message.
- Any visual glitches (overlapping text, badge not rendering, tooltip not appearing, wrong color for a given state) — describe precisely, don't just say "looks off."
- Whether the whole test was completable, or if you got stuck anywhere (e.g. no diagrams existed and creating one failed).

Do not attempt to fix anything — this is observation/testing only. Do not modify the dev server, do not run terminal commands, browser-only.

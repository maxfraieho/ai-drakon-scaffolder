# Fix: DiagramEditorPage never populated useDiagramStore — Validate button stayed permanently disabled

**Date:** 2026-08-21
**Branch:** `phase0-stabilize`

## Root cause (not MinIO)

Manual UI testing of Slice 5's validator-compat-badge repeatedly hit a disabled "Validate now" button on `/diagram/editor` (`DiagramEditorPage.tsx`). Initial hypotheses (JWT expiry, MinIO 502 gating save) were investigated and ruled out one at a time:

- JWT: fixed separately (commit `40cda530`) — confirmed via direct curl chain (login → JWT → worker 200) that this was real but not the final blocker.
- MinIO 502: confirmed the diagram editor's `DrakonEditor.tsx` save path *is* MinIO-first (`saveDiagramToMinio`, with a `api.saveDiagram` fallback), and the save error is caught and swallowed with a toast — it does **not** return early or block the rest of `handleSave`. So a failing MinIO save was never the actual gate.

**Actual root cause:** `DiagramEditorPage.tsx` renders `<ValidationPanel/>` and `<MutationLogPanel/>`, both of which read `useDiagramStore().currentDiagram` — but the page never called `useDiagramStore.getState().setDiagram(...)`. `DrakonEditor.tsx` doesn't import `useDiagramStore` at all; it keeps the diagram in its own internal canvas-widget state, and its `onSaved` callback only reports back a `diagramId` string, not diagram content. `currentDiagram` was therefore always `null` on this route, so `ValidationPanel`'s `disabled={isValidating || !currentDiagram}` was permanently true, and `runValidation`'s early `if (!currentDiagram) return;` meant `setCompatibility(...)` — the line that actually produces Slice 5's badge — was never reachable, regardless of backend health.

## Fix

`src/pages/DiagramEditorPage.tsx`: added a `useEffect` that calls `useDiagramStore.getState().setDiagram(storedDiagram)` whenever the diagram loaded from `readDiagramsFromStorage()` (existing diagrams, keyed by `diagramId`) changes. This makes `currentDiagram` non-null for the "open an existing diagram" flow, which is what unblocks Validate/the compat badge.

**Known remaining gap, not fixed here (documented, not silently hidden):** a brand-new diagram (`isNew=true`) has no `storedDiagram` yet, and live in-widget edits before the diagram's first save never leave `DrakonEditor`'s internal state — `currentDiagram` stays `null` until something writes the diagram to `localStorage` in the shape `readDiagramsFromStorage()` expects, which the current MinIO/Git save path does not do. Making unsaved new-diagram edits validatable live would require either wiring `useDiagramStore` directly into `DrakonEditor.tsx`'s widget-change handlers, or having `DrakonEditor` report full diagram content (not just an id) through a richer `onSaved`/`onChange` callback — both larger, riskier changes than this fix, intentionally out of scope here.

## Validation

- `pnpm test`: 93/93 passed (11 files), no regressions.
- `pnpm build`: succeeds.
- `tsc --noEmit`: 13 pre-existing errors, unchanged, none in `DiagramEditorPage.tsx`.

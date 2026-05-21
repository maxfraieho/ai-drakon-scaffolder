# Prompt 50 — Fix activeProject in Docs/Notes/Graph tabs

## Context

Stack: React 18 + Vite + TanStack Router + shadcn/ui + Tailwind.
Critical: every file change must be applied to BOTH `src/` AND `.lovable/src/`.

---

## Problem
`src/lib/garden/notesApi.ts` calls `/v1/notes/list`, `/v1/notes/graph` etc. without a `?project=` param.
`src/components/docs/DocsFilesTab.tsx` and `NotesGraphTab.tsx` do not use `useProject()`.
Result: switching active project in ProjectSelector has no effect on Docs/Notes/Graph tabs.

---

## Fix in `src/lib/garden/notesApi.ts` AND `.lovable/src/lib/garden/notesApi.ts`

Add optional `project?: string` parameter to these functions and append `?project=...` to URLs when truthy:

- `fetchNotesTree(project?: string)` — append `&project=${encodeURIComponent(project)}` to `/v1/notes/list?flat=false`
- `fetchNote(slug: string, project?: string)` — append `&project=${encodeURIComponent(project)}` to `/v1/notes/get?slug=...`
- `fetchNotesGraph(project?: string)` — append `?project=${encodeURIComponent(project)}` to `/v1/notes/graph`
- `saveNote(payload, project?: string)` — add `project` field to the JSON body
- `deleteNote(slug: string, project?: string)` — add `project` field to the JSON body

Only append when `project` is truthy.

---

## Fix in `src/components/docs/DocsFilesTab.tsx` AND `.lovable/src/components/docs/DocsFilesTab.tsx`

1. Add: `import { useProject } from "@/context/ProjectContext";`
2. Inside component: `const { activeProject } = useProject();`
3. Pass `activeProject?.slug` to every `fetchNotesTree(...)` and `fetchNote(...)` call
4. Add `activeProject?.slug` to useEffect dependency arrays so data re-fetches on project switch

---

## Fix in `src/components/docs/NotesGraphTab.tsx` AND `.lovable/src/components/docs/NotesGraphTab.tsx`

1. Add: `import { useProject } from "@/context/ProjectContext";`
2. Inside component: `const { activeProject } = useProject();`
3. Pass `activeProject?.slug` to `fetchNotesGraph(...)`
4. Add `activeProject?.slug` to the useEffect dependency array

---

## CRITICAL: Dual-path sync rule
Apply ALL changes to BOTH `src/` and `.lovable/src/`.

---

## Fix 2: fetchNotesGraph missing auth headers + error guard

In `src/lib/garden/notesApi.ts` AND `.lovable/src/lib/garden/notesApi.ts`:

`fetchNotesGraph` is the **only** function in this file that does NOT include `authHeaders()`. This causes a 401/redirect when the Worker requires auth — `res.json()` fails and shows a cryptic error.

### Fix

Change the fetch call in `fetchNotesGraph` from:
```typescript
const res = await fetch(workerUrl() + '/v1/notes/graph');
```
To:
```typescript
const qs = project ? `?project=${encodeURIComponent(project)}` : "";
const res = await fetch(`${workerUrl()}/v1/notes/graph${qs}`, {
  headers: authHeaders(),
});
if (!res.ok) throw new Error(`Graph: ${res.status} ${res.statusText}`);
```

Remove the duplicate `qs` construction if it already exists from Fix 1 above — just merge into one fetch call.

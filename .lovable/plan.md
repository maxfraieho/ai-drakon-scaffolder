## Scope

Three connected features tied together by a new MCP client helper that talks to `VITE_WORKER_URL/mcp` (JSON-RPC over `tools/call`).

## Files to add

- `src/lib/mcp/client.ts` — typed wrapper around `POST /mcp` for `tools/call` (handles `Authorization: Bearer <jwt>`, optional `X-Github-Token`, JSON-RPC envelope, error unwrapping).
- `src/lib/mcp/projects.ts` — helpers: `listProjects()` (calls `drakon.listdiagrams` with empty folderSlug, extracts unique first path segments), `saveDiagramToMinio()`, `saveDiagramToGit()`, `sanitizeDiagramId()`.
- `src/components/drakon/ProjectFolderSection.tsx` — reusable form section with the 5 fields described in Feature 1, plus eye-toggle password input. Persists to `localStorage`/`sessionStorage` keys `drakon_last_folder`, `drakon_last_repo`, `drakon_last_branch`, `drakon_gh_write_token`.

## Files to edit

- `src/components/drakon/DrakonEditor.tsx`
  - Mount `<ProjectFolderSection>` above the bottom icon toolbar.
  - Replace `handleSave` with logic that:
    1. always calls `saveDiagramToMinio(folderSlug, diagramId, diagram)`
    2. if "Save to git" checked + token present, also calls `saveDiagramToGit(...)`
    3. shows two `toast.success` / `toast.error` results (one per target).

- `src/pages/DiagramsPage.tsx`
  - Add a "Project" dropdown above the diagram grid populated from `listProjects()` with an "All projects" option.
  - When a project (other than "All") is selected, override `folderDiagrams` to filter by that folderSlug.
  - Each card subtitle gets `{folderSlug} / {diagramId}` (small mono text).

- `src/routes/sync.tsx` (closest thing to "GitHub Analysis page" — the place where analysis results are rendered)
  - Below the diff results add a "Bind analysis to project folder" card containing:
    - editable "MinIO folder" pre-filled with `{owner}--{repo}` derived from `localStorage.github.lastRepo`
    - same `<ProjectFolderSection>` (compact mode)
    - "Save all to MinIO + git" button that iterates `diff.missingInDiagram` (the analyzer-suggested diagrams) and for each calls `saveDiagramToMinio` (+ `saveDiagramToGit` if token).
    - Thin 4px progress bar `Saving N/M diagrams…`
    - Completion toast + "Open in Editor" ghost button → `/diagrams?folder=...`.

- Mirror every change under `.lovable/src/...`.

## Technical notes

- MCP envelope:
  ```ts
  POST {workerUrl}/mcp
  { "jsonrpc":"2.0", "id":1, "method":"tools/call",
    "params":{ "name":"drakon.savediagram", "arguments": {...} } }
  ```
  Response unwrap: `result.content[0].text` or `result.structuredContent` depending on tool; helper handles both.
- `sanitizeDiagramId(s) = s.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9_\-]/g,'').slice(0,80)`.
- Token never logged, never stored in `localStorage` — only `sessionStorage`.
- All new UI uses existing dark tokens (`bg-[var(--bg-elevated)]`, `border-[var(--border-subtle)]`, etc.). No new colors.
- Additive: existing `api.saveDiagram` flow stays as fallback path; new save path is preferred when ProjectFolderSection has a folder set.

## Out of scope

- Modifying `drakon-mcp-worker` (assumed to already expose `drakon.savediagram` / `drakon.savetogit` / `drakon.listdiagrams`).
- The "GitHub Analysis page" mentioned in Feature 2 doesn't exist as a standalone page; integrating into `/sync` (which renders analysis-derived suggestions) is the closest fit. If you want a brand-new `/analysis` page instead, say so before I start.

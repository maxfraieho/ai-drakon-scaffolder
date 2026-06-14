# Prompt 11 — Project Folder Binding + drn/ Save Flow

## Context

The DRAKON Worker now supports dual storage:
1. **MinIO** — `drakon.savediagram({ folderSlug, diagramId, diagram, owner?, repo?, branch? })` — always saved
2. **GitHub drn/ folder** — `drakon.savetogit({ owner, repo, branch, diagramId, diagram })` — saves `drn/{diagramId}.json` directly into the repo

When saving to git, the MCP call must include `X-Github-Token` header with a write-capable token.

Additional new tools:
- `drakon.listgitdiagrams({ owner, repo, branch? })` — list `drn/` contents
- `drakon.getgitdiagram({ owner, repo, branch?, diagramId })` — fetch single diagram from `drn/`

---

## Feature 1 — Project Folder Selector in Editor

In **DrakonEditor** (save dialog / sidebar), add a **"Project folder"** section:

**Fields:**
- `Folder (MinIO)` — combobox, shows existing folders from `drakon.listdiagrams()`, allows typing new name
- `GitHub repo` — text input, format `owner/repo` (e.g. `maxfraieho/free-claude-code`)
- `Branch` — text input, default `main`
- `Save to git` — checkbox (default off), enabled only when repo is filled
  - Shows note: "Requires a token with repo write scope"

**GitHub Token input:**
- Appears when "Save to git" is checked
- Label: "GitHub write token"
- Type: `password` input (masked)
- Stored in `sessionStorage` key `drakon_gh_write_token` (session only, not localStorage)

**Save button behavior:**
1. Always call `drakon.savediagram` (MinIO)
2. If "Save to git" checked: also call `drakon.savetogit` with token in `X-Github-Token` header
3. Show result: "✓ Saved to MinIO" + "✓ Saved to git: drn/{diagramId}.json" (or error per target)

**Persistence:**
- `localStorage` key `drakon_last_folder` — MinIO folder slug
- `localStorage` key `drakon_last_repo` — GitHub owner/repo
- `localStorage` key `drakon_last_branch` — branch name

---

## Feature 2 — Auto-bind Analysis Results to Project Folder

On the **GitHub Analysis page** (owner/repo input → Analyze):

After analysis completes and diagrams list is shown:

1. Auto-set `folderSlug` = `{owner}--{repo}` (double dash, no slashes)
   - Example: `maxfraieho/free-claude-code` → `maxfraieho--free-claude-code`
2. Show **"Save all to MinIO + git"** button (below results list)
3. Before saving to git: show token input (same password field as in editor)
4. Clicking save:
   - Iterates all returned diagrams
   - Calls `drakon.savediagram` for each (MinIO, and git if token provided)
   - `diagramId` = diagram name sanitized: lowercase, spaces→`-`, max 80 chars
5. Progress bar: "Saving 12/83 diagrams..."
6. Completion: "✓ 83 diagrams → MinIO folder `maxfraieho--free-claude-code`" + "✓ git drn/ updated" (if applicable)
7. "Open in Editor" button after completion

---

## Feature 3 — Diagrams Page: Project Filter

On the **Diagrams page**:

- Add a **"Project"** dropdown (top of page or left sidebar)
- Populated by calling `drakon.listdiagrams` with no folderSlug → extract unique first-path-segments
- Selecting a project filters the diagram list
- "All projects" option shows everything
- Each diagram card shows: `{folderSlug} / {diagramId}`

---

## Technical Notes

- `VITE_WORKER_URL` = `https://drakon-antigravity-worker.maxfraieho.workers.dev`
- MCP calls: POST to `{VITE_WORKER_URL}/mcp` with `Authorization: Bearer {MCP_TOKEN}`
- For git writes: add `X-Github-Token: {gitWriteToken}` header
- `drakon.listdiagrams` with empty `folderSlug` returns all keys — split on `/`, collect unique first segments
- Keep all existing error handling patterns (dark theme alerts)
- No breaking changes to existing flows

---

## Design

- All new inputs: same dark-theme style as existing Settings page inputs
- "Save to git" checkbox: accent color toggle
- Progress bar: thin, accent-colored (same as existing loading indicators)
- Token field: password type with eye-toggle icon
- "Open in Editor" button: ghost variant
- Keep existing layouts — additive changes only

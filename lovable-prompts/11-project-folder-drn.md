# Prompt 11 — Project Folder Binding + drn/ Save Flow

## Context

The DRAKON editor saves diagrams to MinIO via the MCP Worker (`drakon.savediagram`).
Currently the user must manually specify `folderSlug` and `diagramId`.

We need two connected improvements:

---

## Feature 1 — Project Folder Selector in Editor

In **DrakonEditor** (the diagram save dialog / sidebar), add a **"Project folder"** field:

- Input type: `<select>` + free-text fallback (combobox)
- Populated by calling `drakon.listdiagrams` with no folderSlug → returns top-level prefixes from MinIO
- Also allow typing a new folder name manually
- Selected value becomes `folderSlug` when saving
- Persist last-used folder in `localStorage` key `drakon_last_folder`
- Under the input show helper text: `Diagrams will be saved to MinIO: {folderSlug}/{diagramId}.json`

**Save flow:**
1. User edits diagram in editor
2. Clicks Save
3. If no folder selected → prompt to choose (don't block, use last-used as default)
4. Call `drakon.savediagram({ folderSlug, diagramId, diagram })`
5. Show success toast with path

---

## Feature 2 — Auto-bind Analysis Results to Project Folder

On the **GitHub Analysis page** (where user enters owner/repo and clicks Analyze):

After analysis completes and diagrams are shown:

1. Show a **"Save to MinIO"** button (primary, below results list)
2. The default `folderSlug` is auto-derived from the repo: `{owner}--{repo}` (double dash, no slashes)
   - Example: `maxfraieho/free-claude-code` → `maxfraieho--free-claude-code`
3. User can change the folder name before saving
4. Clicking "Save to MinIO" iterates through all returned diagrams and calls `drakon.savediagram` for each:
   - `folderSlug` = derived project folder
   - `diagramId` = diagram name (sanitized: lowercase, replace spaces with `-`, max 80 chars)
   - `diagram` = the IR object
5. Show progress: "Saving 12/83 diagrams..." with a progress bar
6. On completion: "✓ 83 diagrams saved to folder `maxfraieho--free-claude-code`"
7. After save, offer: **"Open in Editor"** button (navigates to editor with that folder pre-selected)

---

## Feature 3 — Folder List on Diagrams Page

On the **Diagrams page** (where saved diagrams are shown):

- Add a left sidebar or top filter: **"Project"** dropdown
- Populated from MinIO `listdiagrams` call → top-level folder names
- Selecting a project filters the diagram list to that folder
- "All projects" option shows everything (flat list)
- Each diagram card shows: `{folderSlug} / {diagramId}`

---

## Technical Notes

- All MinIO calls go through the Worker MCP at `VITE_WORKER_URL/mcp`
- Auth header: `Authorization: Bearer {token}` (same as existing)
- `drakon.listdiagrams` with `folderSlug=""` returns all keys — parse to extract unique top-level prefixes (split on `/`, take first segment)
- `drakon.savediagram` args: `{ folderSlug: string, diagramId: string, diagram: object }`
- Keep existing error handling patterns

---

## Design

- Project folder selector: same style as existing Settings inputs (dark theme, border-accent)
- Progress bar: thin accent-colored bar, same as existing loading states
- "Open in Editor" button: ghost variant
- Keep all existing layouts — these are additive changes only

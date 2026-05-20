# 43 — Project Manager: Add / Delete Projects

**Backend is already deployed.**

`docs-agent` routes live on `192.168.3.184`:
- `POST /v1/projects/add` — body `{ slug, name, path, description?, hasDrakonIr?, hasDocs?, github? }`
- `DELETE /v1/projects/:slug` — remove project by slug
- `GET /v1/projects/list` — list all projects (existing from prompt 42)

---

## 1. api.ts additions

Add to the `api` object in `src/lib/api.ts`:

```ts
addProject: (data: {
  slug: string; name: string; path: string; description?: string;
  hasDrakonIr?: boolean; hasDocs?: boolean;
  github?: { owner: string; repo: string; branch: string };
}): Promise<{ success: boolean; project: unknown }> =>
  fetch(`${resolveApiBase()}/v1/projects/add`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json()),

deleteProject: (slug: string): Promise<{ success: boolean; deleted: string }> =>
  fetch(`${resolveApiBase()}/v1/projects/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: headers(),
  }).then((r) => r.json()),
```

---

## 2. ProjectContext — extend with loadProjects + loading

Update `src/context/ProjectContext.tsx`:

```tsx
interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  projects: Project[];
  loadProjects: () => Promise<void>;
  loading: boolean;
}
```

Add `loading` state and expose `loadProjects()` so components can trigger
a refresh after add/delete.

---

## 3. ProjectSelector — full project manager

Rewrite `src/components/workspace/ProjectSelector.tsx` with two levels:

### Level 1: compact selector (always visible in sidebar)
Same amber/mono style as prompt 42.
Add a ⚙️ gear icon button (Settings2) at the right of the selector row.
Click → opens the Project Manager dialog.

### Level 2: Project Manager dialog
`Dialog` from shadcn/ui, triggered by gear icon.

**Header:** "Управління проектами" + close button.

**Project list:**
```
[ sharon-global ]  /home/vokov/projects/uav-watcher  [Delete]
[ uav-watcher  ]  /home/vokov/projects/uav-watcher   [Delete]
+ Додати проект
```

Each row: project name chip (amber), grey path, red Trash2 icon button.
Delete: shows `Loader2` spinner inline while `api.deleteProject(slug)` runs,
then `loadProjects()`. Toast on success/error.

**Add Project form** (opens as nested Dialog or Drawer):
Fields:
| Field       | Required | Placeholder               |
|-------------|----------|---------------------------|
| slug        | ✓        | sharon-global             |
| name        | ✓        | Sharon Global             |
| path        | ✓        | /home/vokov/projects/...  |
| description | –        | Short description          |
| GitHub owner| –        | maxfraieho                |
| GitHub repo | –        | Sharon                    |
| GitHub branch| –       | main                      |

Submit button "Додати" — calls `api.addProject()`, then `loadProjects()`,
closes both dialogs, shows toast.

Validation: `slug`, `name`, `path` required — show `toast.error` if missing.

---

## 4. Constraints

- Use existing shadcn/ui: Dialog, Button, Input, Label, Loader2
- Dark terminal aesthetic: `var(--bg-surface)`, `var(--accent-amber)`, font-mono
- No new pages
- GitHub fields optional — collapse under "GitHub (необов'язково)" toggle
- TypeScript strict — no `any`

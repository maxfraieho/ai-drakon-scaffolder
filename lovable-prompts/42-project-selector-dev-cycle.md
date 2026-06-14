# 42 — Project Selector + Dev Cycle UI

**Backend is already deployed.**

Worker endpoints live at `https://drakon-antigravity-worker.maxfraieho.workers.dev`:
- `GET /v1/projects/list` — returns sharon-global + uav-watcher
- `GET /v1/drakon-ir/list?project=slug` — lists IR diagrams for project
- `GET /v1/drakon-ir/{name}?project=slug` — returns IR diagram JSON

---

## 1. ProjectContext

Create `src/context/ProjectContext.tsx`:

```tsx
import { createContext, useContext, useState, ReactNode } from "react";

export interface Project {
  slug: string;
  name: string;
  description: string;
  hasDrakonIr: boolean;
  hasDocs: boolean;
  exists: boolean;
}

interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (p: Project) => void;
  projects: Project[];
  setProjects: (ps: Project[]) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, projects, setProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
```

Wrap the app root with `<ProjectProvider>`.

---

## 2. api.ts additions

Add to the `api` object in `src/lib/api.ts`:

```ts
listProjects: (): Promise<{ success: boolean; projects: unknown[] }> =>
  fetch(resolveApiBase() + '/v1/projects/list').then((r) => r.json()),

listDrakonIr: (project?: string): Promise<{ success: boolean; diagrams: string[]; count: number }> => {
  const qs = project ? '?project=' + encodeURIComponent(project) : '';
  return fetch(resolveApiBase() + '/v1/drakon-ir/list' + qs).then((r) => r.json());
},

getDrakonIr: (name: string, project?: string): Promise<{ success: boolean; name: string; diagram: object }> => {
  const proj = project ? '&project=' + encodeURIComponent(project) : '';
  return fetch(resolveApiBase() + '/v1/drakon-ir/' + encodeURIComponent(name) + '?_=1' + proj).then((r) => r.json());
},
```

---

## 3. ProjectSelector component

Create `src/components/workspace/ProjectSelector.tsx`.

On mount: call `api.listProjects()`, store in ProjectContext.
Show a compact selector with project names.
When selected: call `setActiveProject(project)`.

If no project: pulsing amber dot + "Select project".
If selected: project name in amber + small grey description below.

Style: match dark terminal aesthetic — `var(--bg-surface)`, `var(--accent-amber)`,
font-mono, 10px uppercase "ACTIVE PROJECT" label above selector. Max height 56px.

---

## 4. DevCyclePanel component

Create `src/components/workspace/DevCyclePanel.tsx`.

Collapsible panel at bottom of left sidebar. Toggle button "DEV CYCLE".

When expanded shows 4 steps:
```
1 ANALYZE     [Run]  ○  ast → extract modules
2 DRAKON IR   [Run]  ○  generate flow diagrams
3 DOCUMENT    [Run]  ○  write module docs
4 REVIEW      [→]    ○  open Docs / Diagrams
```

Status: ○ idle, animated amber pulse = running, ✓ done, ✗ error.
Steps 1-3 disabled when no activeProject.

API calls (use `activeProject.slug`):
- Step 1: `POST /v1/architect/analyze` body `{ project }`
- Step 2: `POST /v1/drakon/generate` body `{ project }`
- Step 3: `POST /v1/docs/document` body `{ project, instructions: "" }`
- Step 4: navigate to `/docs` or `/diagrams`

Style: dark panel, amber step numbers, mono font, stagger animation on open.

---

## 5. Wire into WorkspaceShell

In `src/components/workspace/WorkspaceShell.tsx`:
1. Add `<ProjectSelector />` at the very top of left sidebar (above nav links)
2. Add `<DevCyclePanel />` as collapsible panel at the bottom of left sidebar

Separate with 1px `border-b` / `border-t` using `var(--border-subtle)`.

---

## 6. DrakonIrPanel: project-aware

In `src/components/workspace/DrakonIrPanel.tsx`:
- Add `const { activeProject } = useProject();`
- Change `api.listDrakonIr()` to `api.listDrakonIr(activeProject?.slug)`
- Change `api.getDrakonIr(name)` to `api.getDrakonIr(name, activeProject?.slug)`
- Add `activeProject?.slug` to useEffect deps array
- Show project chip below header: `[ sharon-global ]` in grey

---

## Constraints

- No new pages — everything in the sidebar
- Use existing shadcn/ui (Select, Button, Collapsible)
- Dark terminal aesthetic: dark backgrounds, amber accents, mono text
- YAGNI: project in React context, session only

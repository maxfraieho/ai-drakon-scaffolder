# Lovable Prompt 43 — Project Manager + GitHub Integration

## Контекст

Backend вже готовий і задеплоєний. Worker `https://drakon-antigravity-worker.maxfraieho.workers.dev` повертає 4 проекти з GitHub-метаданими:

```json
GET /v1/projects/list
{
  "success": true,
  "projects": [
    { "slug": "sharon-global", "name": "Sharon Global", "github": {"owner": "maxfraieho", "repo": "sharon-global", "branch": "main"}, ... },
    { "slug": "uav-watcher", "name": "UAV Watcher", "github": {"owner": "maxfraieho", "repo": "uav-watcher", "branch": "master"}, ... },
    { "slug": "code-proxy", "name": "Code Proxy", "github": {"owner": "maxfraieho", "repo": "code-proxy", "branch": "main"}, ... },
    { "slug": "ai-drakon-setup", "name": "AI-DRAKON Platform", "github": {"owner": "maxfraieho", "repo": "ai-drakon-setup", "branch": "main"}, ... }
  ]
}

POST /v1/projects/add   (Bearer auth)  body: {slug, name, path, description, hasDrakonIr, hasDocs, github?}
DELETE /v1/projects/{slug}  (Bearer auth)
```

## Зміни 1: `src/lib/api.ts`

Додати після `getDrakonIr`:

```ts
addProject: (data: {
  slug: string; name: string; path: string; description?: string;
  hasDrakonIr?: boolean; hasDocs?: boolean;
  github?: { owner: string; repo: string; branch: string };
}): Promise<{ success: boolean; project: unknown }> =>
  fetch(`${resolveApiBase()}/v1/projects/add`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => r.json()),

deleteProject: (slug: string): Promise<{ success: boolean; deleted: string }> =>
  fetch(`${resolveApiBase()}/v1/projects/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: headers(),
  }).then((r) => r.json()),
```

## Зміни 2: `src/context/ProjectContext.tsx`

Повністю замінити файл:

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export interface ProjectGithub {
  owner: string;
  repo: string;
  branch: string;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  hasDrakonIr: boolean;
  hasDocs: boolean;
  exists: boolean;
  github?: ProjectGithub;
}

interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (p: Project) => void;
  projects: Project[];
  loadProjects: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "ai_drakon_active_project";

const ProjectContext = createContext<ProjectContextValue | null>(null);

function toProject(input: unknown): Project | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  const slug = typeof d.slug === "string" ? d.slug : "";
  if (!slug) return null;
  let github: ProjectGithub | undefined;
  if (d.github && typeof d.github === "object") {
    const g = d.github as Record<string, unknown>;
    if (typeof g.owner === "string" && typeof g.repo === "string") {
      github = { owner: g.owner, repo: g.repo, branch: typeof g.branch === "string" ? g.branch : "main" };
    }
  }
  return {
    slug,
    name: typeof d.name === "string" ? d.name : slug,
    description: typeof d.description === "string" ? d.description : "",
    hasDrakonIr: Boolean(d.hasDrakonIr),
    hasDocs: Boolean(d.hasDocs),
    exists: d.exists === false ? false : true,
    github,
  };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  const setActiveProject = useCallback((p: Project) => {
    setActiveProjectState(p);
    localStorage.setItem(STORAGE_KEY, p.slug);
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listProjects();
      const parsed = ((result.projects ?? []) as unknown[]).map(toProject).filter(Boolean) as Project[];
      setProjects(parsed);
      const savedSlug = localStorage.getItem(STORAGE_KEY);
      const saved = savedSlug ? parsed.find((p) => p.slug === savedSlug) : null;
      setActiveProjectState((prev) => {
        if (prev) {
          const updated = parsed.find((p) => p.slug === prev.slug);
          return updated ?? prev;
        }
        return saved ?? parsed[0] ?? null;
      });
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, projects, loadProjects, loading }}>
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

## Зміни 3: `src/components/workspace/ProjectSelector.tsx`

Повністю замінити. Новий компонент — мінімалістичний «project switcher» + кнопка управління:

```tsx
import { useEffect, useState } from "react";
import { FolderOpen, Plus, Settings2, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useProject, type Project } from "@/context/ProjectContext";

export function ProjectSelector() {
  const { projects, activeProject, setActiveProject, loadProjects, loading } = useProject();
  const [managerOpen, setManagerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    slug: "", name: "", path: "", description: "",
    ghOwner: "", ghRepo: "", ghBranch: "main",
  });

  const handleAdd = async () => {
    if (!form.slug || !form.name || !form.path) {
      toast.error("Заповніть slug, name та path");
      return;
    }
    setAdding(true);
    try {
      const github = form.ghOwner && form.ghRepo
        ? { owner: form.ghOwner, repo: form.ghRepo, branch: form.ghBranch || "main" }
        : undefined;
      await api.addProject({ slug: form.slug, name: form.name, path: form.path, description: form.description, github });
      await loadProjects();
      setAddOpen(false);
      setForm({ slug: "", name: "", path: "", description: "", ghOwner: "", ghRepo: "", ghBranch: "main" });
      toast.success(`Проект "${form.name}" додано`);
    } catch {
      toast.error("Помилка додавання проекту");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (slug: string) => {
    setDeleting(slug);
    try {
      await api.deleteProject(slug);
      await loadProjects();
      toast.success("Проект видалено");
    } catch {
      toast.error("Помилка видалення");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      {/* Compact project display in sidebar */}
      <div className="px-2 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1.5">Активний проект</p>

        {loading && projects.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-amber)]" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">Завантаження…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Active project card */}
            {activeProject ? (
              <div
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--accent-amber)]/30 bg-[var(--bg-base)] px-2 py-1.5 cursor-pointer hover:border-[var(--accent-amber)]/60 transition-colors"
                onClick={() => setManagerOpen(true)}
              >
                <span className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  activeProject.exists ? "bg-emerald-400" : "bg-red-400"
                )} />
                <span className="flex-1 min-w-0 font-mono text-[11px] text-[var(--accent-amber)] truncate">
                  {activeProject.name}
                </span>
                <Settings2 className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">Не обрано</span>
              </div>
            )}

            {/* Quick project switcher — other projects */}
            {projects.length > 1 && (
              <div className="flex flex-col gap-0.5">
                {projects
                  .filter((p) => p.slug !== activeProject?.slug)
                  .map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setActiveProject(p)}
                      className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        p.exists ? "bg-[var(--text-muted)]" : "bg-red-400/60"
                      )} />
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-left hover:bg-white/5 transition-colors mt-0.5"
            >
              <Plus className="h-3 w-3 text-[var(--text-muted)]" />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">Додати проект</span>
            </button>
          </div>
        )}
      </div>

      {/* Project manager modal */}
      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-lg font-mono">
          <DialogHeader>
            <DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
              Управління проектами
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[var(--text-muted)]">
              Оберіть активний проект або видаліть непотрібні
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {projects.map((p) => (
              <div
                key={p.slug}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-sm)] border p-3 cursor-pointer transition-colors",
                  p.slug === activeProject?.slug
                    ? "border-[var(--accent-amber)]/50 bg-[var(--accent-dim)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-subtle)]/60 hover:bg-white/5"
                )}
                onClick={() => { setActiveProject(p); setManagerOpen(false); }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "h-2 w-2 shrink-0 rounded-full mt-0.5",
                      p.exists ? "bg-emerald-400" : "bg-red-400"
                    )} />
                    <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.name}</span>
                    {p.slug === activeProject?.slug && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-amber)] shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 ml-4 truncate">{p.description}</p>
                  {p.github && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 ml-4">
                      github: {p.github.owner}/{p.github.repo} @ {p.github.branch}
                    </p>
                  )}
                  {!p.exists && (
                    <div className="flex items-center gap-1 ml-4 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      <span className="text-[10px] text-red-400">Папка не знайдена на сервері</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={deleting === p.slug}
                  onClick={(e) => { e.stopPropagation(); void handleDelete(p.slug); }}
                  className="shrink-0 flex items-center justify-center h-6 w-6 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  title="Видалити проект"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setManagerOpen(false); setAddOpen(true); }}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-muted)] hover:border-[var(--accent-amber)]/40 hover:text-[var(--text-secondary)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Додати новий проект
          </button>
        </DialogContent>
      </Dialog>

      {/* Add project modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
              Новий проект
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 block">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm(f => ({...f, slug: e.target.value}))}
                  placeholder="my-project"
                  className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 block">Назва *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="My Project"
                  className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 block">Шлях на сервері *</Label>
              <Input
                value={form.path}
                onChange={(e) => setForm(f => ({...f, path: e.target.value}))}
                placeholder="/home/vokov/workspace/my-project"
                className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
              />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 block">Опис</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Короткий опис проекту"
                className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
              />
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">GitHub (опційно)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={form.ghOwner}
                  onChange={(e) => setForm(f => ({...f, ghOwner: e.target.value}))}
                  placeholder="owner"
                  className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
                />
                <Input
                  value={form.ghRepo}
                  onChange={(e) => setForm(f => ({...f, ghRepo: e.target.value}))}
                  placeholder="repo-name"
                  className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)]"
                />
              </div>
              <Input
                value={form.ghBranch}
                onChange={(e) => setForm(f => ({...f, ghBranch: e.target.value}))}
                placeholder="main"
                className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)] mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(false)}
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              Скасувати
            </Button>
            <Button
              size="sm"
              disabled={adding}
              onClick={() => void handleAdd()}
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              {adding ? "Додаю…" : "Додати"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## Зміни 4: `src/routes/github.tsx`

В функції `GitHubRoute` в самому початку:
- імпортувати `useProject` з `@/context/ProjectContext`  
- після рядку `const githubDefaults = readSettings().github;` додати:

```tsx
const { activeProject } = useProject();

// If active project has GitHub metadata, use it instead of global settings
const ghSource = activeProject?.github ?? null;
const owner = ghSource?.owner ?? githubDefaults.owner;
const repo = ghSource?.repo ?? githubDefaults.repo;
```

- Рядок `const [branch, setBranch] = useState(githubDefaults.branch || "main");` замінити на:
```tsx
const [branch, setBranch] = useState(ghSource?.branch ?? githubDefaults.branch ?? "main");
```

- В `useEffect` що скидає cache (залежить від `owner, repo, branch, token`) — додати `activeProject?.slug` до залежностей, щоб при зміні проекту дерево перезавантажувалось

- В заголовку сторінки (після `<Github className=...`) додати chip із назвою проекту:
```tsx
{activeProject && (
  <span className="ml-2 rounded px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 font-mono text-[10px] text-amber-400">
    {activeProject.name}
  </span>
)}
```

## Ключові вимоги

- Не змінювати і не видаляти `DevCyclePanel`, `AgentChatPanel`, `CommandPalette` — вони вже існують
- `useProject()` вже обгорнутий в `ProjectProvider` в root layout або App.tsx — перевір і не дублюй
- Іконки — тільки з `lucide-react`
- CSS змінні `var(--bg-base)`, `var(--bg-surface)`, `var(--accent-amber)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--accent-dim)`, `var(--radius-sm)` — вже визначені в проекті
- `toast` — з `sonner`
- Всі форми/кнопки — `type="button"` де не є submit

## Очікуваний результат

1. Ліва колонка workspace показує активний проект (amber підсвітка) + список інших проектів для швидкого переключення + кнопка "Додати"
2. Клік на активний проект → відкривається модальне вікно управління (список + видалення + додавання)
3. Вкладка GitHub автоматично показує репозиторій активного проекту
4. При зміні проекту — дерево GitHub оновлюється автоматично

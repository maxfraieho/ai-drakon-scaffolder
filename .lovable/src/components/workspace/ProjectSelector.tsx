import { useState, useEffect } from "react";
import { ChevronDown, Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { type Project, useProject } from "@/context/ProjectContext";
import { useNavigate } from "@tanstack/react-router";
import { readSettings } from "@/lib/settings-storage";

interface GhRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  default_branch: string;
  private: boolean;
  language: string | null;
}

export function ProjectSelector() {
  const {
    projects,
    activeProject,
    setActiveProject,
    loadProjects,
    loading,
    addLocalProject,
    removeLocalProject,
  } = useProject();
  const navigate = useNavigate();
  const [managerOpen, setManagerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [repoInput, setRepoInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GhRepo[]>([]);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const openManager = () => setManagerOpen(true);
    const openAdd = () => { setManagerOpen(false); setAddOpen(true); };
    document.addEventListener("open-project-manager", openManager);
    document.addEventListener("open-add-repo", openAdd);
    return () => {
      document.removeEventListener("open-project-manager", openManager);
      document.removeEventListener("open-add-repo", openAdd);
    };
  }, []);

  const loadUserRepos = async () => {
    const token = readSettings().github?.token;
    if (!token) {
      setSearchError("GitHub token не налаштовано. Введіть owner/repo вручну (напр. maxfraieho/uav-watcher) або додайте токен у Налаштуваннях.");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const resp = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator",
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
      setSearchResults(await resp.json() as GhRepo[]);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSearching(false);
    }
  };

  const searchRepo = async () => {
    const trimmed = repoInput.trim();
    if (!trimmed) { await loadUserRepos(); return; }
    setSearching(true);
    setSearchError("");
    try {
      const token = readSettings().github?.token;
      const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`https://api.github.com/repos/${trimmed}`, { headers });
      if (!resp.ok) throw new Error(resp.status === 404 ? "Репозиторій не знайдено" : `GitHub API ${resp.status}`);
      setSearchResults([await resp.json() as GhRepo]);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Помилка");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickRepo = (repo: GhRepo) => {
    const slug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const project: Project = {
      slug,
      name: repo.full_name,
      description: repo.description ?? "",
      hasDrakonIr: false,
      hasDocs: false,
      exists: true,
      github: {
        owner: repo.owner.login,
        repo: repo.name,
        branch: repo.default_branch,
      },
    };
    addLocalProject(project);
    setActiveProject(project);
    setAddOpen(false);
    setManagerOpen(false);
    setRepoInput("");
    setSearchResults([]);
    toast.success(`Проект ${repo.full_name} додано`);
  };

  const handleDelete = (slug: string) => {
    const localList: Array<{slug: string}> = (() => {
      try { return JSON.parse(localStorage.getItem("ai_drakon_local_projects") || "[]"); } catch { return []; }
    })();
    const isLocal = localList.some(lp => lp.slug === slug);
    if (isLocal) {
      removeLocalProject(slug);
      toast.success("Проект видалено");
    } else {
      setDeleting(slug);
      void api.deleteProject(slug)
        .then(() => loadProjects())
        .then(() => toast.success("Проект видалено"))
        .catch(() => toast.error("Помилка видалення"))
        .finally(() => setDeleting(null));
    }
  };

return (
<>
<div className="px-2 py-1.5 flex flex-col gap-1">
<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">ACTIVE PROJECT</p>
<div className="flex items-start gap-1.5">
<div className="flex-1 min-w-0">
{activeProject ? (
<div className="flex flex-col justify-center min-h-[2rem] gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1">
<div className="flex items-center gap-2">
<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)]" />
<span className="flex-1 truncate font-mono text-[11px] text-[var(--accent-amber)] font-medium">
{activeProject.name}
</span>
</div>
{activeProject.github ? (
<div className="font-mono text-[8px] text-[var(--text-muted)] pl-3.5 truncate" title={`${activeProject.github.owner}/${activeProject.github.repo} (${activeProject.github.branch})`}>
{activeProject.github.owner}/{activeProject.github.repo}
</div>
) : (
<div className="font-mono text-[8px] text-[var(--text-muted)] pl-3.5 flex items-center justify-between gap-1 mt-0.5">
<span className="text-red-400/80">No GitHub config</span>
<button
type="button"
onClick={() => navigate({ to: "/settings" })}
className="font-mono text-[8px] text-[var(--accent-amber)] hover:underline"
>
Setup
</button>
</div>
)}
</div>
) : loading ? (
<div className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2">
<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-amber)]" />
<span className="font-mono text-[11px] text-[var(--accent-amber)] font-medium">Loading...</span>
<Loader2 className="ml-auto h-3 w-3 animate-spin text-[var(--text-muted)]" />
</div>
) : (
<div className="flex flex-col gap-1.5 p-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-base)]/50">
<span className="font-mono text-[10px] text-[var(--text-muted)]">No active project</span>
<Button
type="button"
size="sm"
variant="outline"
onClick={() => navigate({ to: "/settings" })}
className="h-6 font-mono text-[8px] uppercase tracking-wider text-[var(--accent-amber)] hover:text-[var(--accent-amber)] border-[var(--border-subtle)] hover:bg-[var(--accent-dim)]/30 w-full"
>
Setup GitHub
</Button>
</div>
)}
</div>

<Button
type="button"
size="icon"
variant="outline"
onClick={() => setManagerOpen(true)}
className="h-8 w-8 border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
aria-label="Управління проектами"
>
<Settings2 className="h-3.5 w-3.5" />
</Button>
</div>
</div>

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

<div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
{projects.map((p) => (
<div
key={p.slug}
className={cn(
"flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2 cursor-pointer transition-colors",
p.slug === activeProject?.slug
? "border-[var(--accent-amber)]/50 bg-[var(--accent-dim)]"
: "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:bg-white/5"
)}
onClick={() => { setActiveProject(p); setManagerOpen(false); }}
>
<div className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--accent-amber)]/35 bg-[var(--accent-dim)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent-amber)]">
{p.slug}
</div>
<p className="flex-1 truncate text-[10px] text-[var(--text-muted)]">{p.path ?? p.description ??
"—"}</p>
<button
type="button"
disabled={deleting === p.slug}
onClick={(e) => { e.stopPropagation(); void handleDelete(p.slug); }}
className="shrink-0 flex items-center justify-center h-6 w-6 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
title="Видалити проект"
>
{deleting === p.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2
className="h-3.5 w-3.5" />}
</button>
</div>
))}
</div>

<button
type="button"
onClick={() => { setManagerOpen(false); setAddOpen(true); }}
className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-muted)] hover:border-[var(--accent-amber)]/40 hover:text-[var(--text-secondary)] transition-colors w-full"
>
<Plus className="h-3.5 w-3.5" />
Додати новий проект
</button>
</DialogContent>
</Dialog>

<Dialog open={addOpen} onOpenChange={(o) => {
  setAddOpen(o);
  if (o) { setSearchResults([]); setSearchError(""); void loadUserRepos(); }
}}>
  <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-md font-mono">
    <DialogHeader>
      <DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
        Додати репозиторій
      </DialogTitle>
      <DialogDescription className="text-[11px] text-[var(--text-muted)]">
        Введіть owner/repo або оберіть з вашого списку
      </DialogDescription>
    </DialogHeader>

    <div className="flex gap-2">
      <Input
        value={repoInput}
        onChange={(e) => setRepoInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void searchRepo(); }}
        placeholder="maxfraieho/uav-watcher"
        className="h-7 text-[11px] font-mono bg-[var(--bg-base)] border-[var(--border-subtle)] flex-1"
      />
      <Button size="sm" variant="outline" onClick={() => void searchRepo()} disabled={searching}
        className="h-7 font-mono text-[10px] uppercase shrink-0">
        {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Знайти"}
      </Button>
    </div>

    {searchError && <p className="text-[10px] text-red-400 font-mono">{searchError}</p>}

    <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto pr-1">
      {searchResults.map((repo) => (
        <button
          key={repo.full_name}
          type="button"
          onClick={() => pickRepo(repo)}
          className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2.5 py-2 text-left hover:bg-white/5 hover:border-[var(--accent-amber)]/40 transition-colors"
        >
          <span className="font-mono text-[11px] text-[var(--accent-amber)] font-medium">
            {repo.full_name}
          </span>
          {repo.description && (
            <span className="font-mono text-[9px] text-[var(--text-muted)] line-clamp-1">
              {repo.description}
            </span>
          )}
          <div className="flex gap-2 mt-0.5">
            {repo.language && (
              <span className="font-mono text-[8px] text-[var(--text-muted)]">{repo.language}</span>
            )}
            <span className="font-mono text-[8px] text-[var(--text-muted)]">{repo.default_branch}</span>
            {repo.private && (
              <span className="font-mono text-[8px] text-red-400/60">private</span>
            )}
          </div>
        </button>
      ))}
      {searching && (
        <div className="flex items-center justify-center py-4 gap-2 text-[10px] text-[var(--text-muted)] font-mono">
          <Loader2 className="h-3 w-3 animate-spin" /> Пошук...
        </div>
      )}
      {!searching && searchResults.length === 0 && !searchError && (
        <p className="text-[10px] text-[var(--text-muted)] font-mono text-center py-4">
          Введіть owner/repo і натисніть Знайти
        </p>
      )}
    </div>
  </DialogContent>
</Dialog>
</>
);
}


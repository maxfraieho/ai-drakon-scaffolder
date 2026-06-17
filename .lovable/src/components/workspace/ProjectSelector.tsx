import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { type Project, useProject } from "@/context/ProjectContext";
import { readSettings, writeSettings } from "@/lib/settings-storage";
import { account, databases } from "@/lib/appwrite";

interface GhRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  default_branch: string;
  private: boolean;
  language: string | null;
}

export function ProjectSelector({ withDialogs = true }: { withDialogs?: boolean }) {
  const {
    projects,
    activeProject,
    setActiveProject,
    loadProjects,
    loading,
    addLocalProject,
    removeLocalProject,
  } = useProject();
  const [managerOpen, setManagerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [repoInput, setRepoInput] = useState("");
  const [comboFilter, setComboFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GhRepo[]>([]);
  const [searchError, setSearchError] = useState("");

  const [patInput, setPatInput] = useState("");
  const [savingPat, setSavingPat] = useState(false);

  const savePatToken = async () => {
    const t = patInput.trim();
    if (!t) return;
    setSavingPat(true);
    try {
      // Validate token with GitHub API
      const resp = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json" },
      });
      if (!resp.ok) throw new Error("Невалідний токен");
      const ghUser = await resp.json();
      // Save to localStorage
      const s = readSettings();
      writeSettings({ ...s, github: { ...s.github, token: t } });
      // Save to Appwrite user_profiles for cross-device sync
      try {
        const session = await account.getSession("current");
        const userId = session.userId;
        try {
          await databases.createDocument("ai-drakon", "user_profiles", userId, { githubToken: t, githubLogin: ghUser.login || "" });
        } catch {
          try { await databases.updateDocument("ai-drakon", "user_profiles", userId, { githubToken: t, githubLogin: ghUser.login || "" }); } catch {}
        }
      } catch {}
      setPatInput("");
      setSearchError("");
      toast.success(`GitHub підключено: ${ghUser.login}`);
      void loadUserRepos(); // Reload repos
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSavingPat(false);
    }
  };

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

  useEffect(() => {
    if (addOpen) {
      setSearchResults([]);
      setSearchError("");
      setComboFilter("");
      void loadUserRepos();
    }
  }, [addOpen]);

  const loadUserRepos = async () => {
    let token = readSettings().github?.token;

    // Fallback: try Appwrite user_profiles (cross-device) then session providerAccessToken
    if (!token) {
      try {
        const session = await account.getSession("current");
        // 1. user_profiles — written on OAuth login, syncs cross-device
        try {
          const doc: any = await databases.getDocument("ai-drakon", "user_profiles", session.userId);
          if (doc.githubToken) {
            token = doc.githubToken;
            const s = readSettings();
            writeSettings({ ...s, github: { ...s.github, token } });
          }
        } catch (_) {}
        // 2. providerAccessToken from current session (works only on same-device session)
        if (!token && session.provider === "github" && session.providerAccessToken) {
          token = session.providerAccessToken;
          const s = readSettings();
          writeSettings({ ...s, github: { ...s.github, token } });
        }
      } catch (_) {}
    }

    if (!token) {
      setSearchError("__no_token__");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const resp = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (resp.status === 401) {
        // Token expired or revoked — drop it so the user is re-prompted cleanly
        try {
          const s = readSettings();
          writeSettings({ ...s, github: { ...s.github, token: "" } });
        } catch (_) {}
        setSearchError("__no_token__");
        return;
      }
      if (resp.status === 403) {
        // Valid token but missing `repo` scope (or rate-limited)
        throw new Error("Токен без доступу до репозиторіїв (потрібен scope 'repo'). Перелогіньтесь через GitHub або вкажіть PAT у Settings.");
      }
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
    setComboFilter("");
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

  const filteredRepos = searchResults.filter(r =>
    comboFilter === "" ||
    r.full_name.toLowerCase().includes(comboFilter.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(comboFilter.toLowerCase())
  );

return (
<>
<div className="px-2 py-1.5">
  <div className="flex items-center justify-between mb-1">
    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Репозиторій</p>
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("open-add-repo"))}
      title="Додати репозиторій"
      className="h-4 w-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors"
    >
      <Plus className="h-3 w-3" />
    </button>
  </div>
  {activeProject ? (
    <div
      className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={() => document.dispatchEvent(new CustomEvent("open-project-manager"))}
      title="Переключити репозиторій"
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)]" />
        <span className="flex-1 truncate font-mono text-[11px] text-[var(--accent-amber)] font-medium">
          {activeProject.github
            ? `${activeProject.github.owner}/${activeProject.github.repo}`
            : activeProject.name}
        </span>
      </div>
    </div>
  ) : loading ? (
    <div className="flex h-7 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2">
      <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)]" />
      <span className="font-mono text-[10px] text-[var(--text-muted)]">Завантаження...</span>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new CustomEvent("open-add-repo"))}
      className="flex items-center gap-1.5 w-full h-7 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-subtle)] px-2 font-mono text-[10px] text-[var(--text-muted)] hover:border-[var(--accent-amber)]/40 hover:text-[var(--accent-amber)] transition-colors"
    >
      <Plus className="h-3 w-3" />
      Додати репозиторій
    </button>
  )}
</div>

{withDialogs && <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
<DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] max-w-lg font-mono rounded-2xl">
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
</Dialog>}

{withDialogs && <Dialog open={addOpen} onOpenChange={setAddOpen}>
  <DialogContent className="sm:max-w-md bg-[var(--bg-surface)] border-[var(--border-subtle)] font-mono rounded-2xl">
    <DialogHeader>
      <DialogTitle className="text-[13px] uppercase tracking-wider text-[var(--text-primary)]">
        Додати репозиторій
      </DialogTitle>
      <DialogDescription className="text-[11px] text-[var(--text-muted)]">
        Введіть назву або оберіть з вашого списку
      </DialogDescription>
    </DialogHeader>

    <div className="flex flex-col gap-3 py-1">
      {/* Combobox з живим пошуком */}
      <Command shouldFilter={false} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)]">
        <CommandInput
          placeholder="Пошук репозиторію..."
          value={comboFilter}
          onValueChange={setComboFilter}
          className="font-mono text-[12px]"
        />
        <CommandList className="max-h-[260px]">
          {searching && (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)]" />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">Завантаження...</span>
            </div>
          )}
          {!searching && searchError === "__no_token__" && (
            <div className="flex flex-col gap-3 p-4">
              <p className="text-[11px] text-[var(--text-muted)] font-mono text-center">
                Потрібен GitHub токен для доступу до репозиторіїв
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void savePatToken()}
                  className="font-mono text-[11px] bg-[var(--bg-base)] border-[var(--border-subtle)] h-8"
                />
                <Button
                  size="sm"
                  onClick={() => void savePatToken()}
                  disabled={savingPat || !patInput.trim()}
                  className="font-mono text-[10px] bg-[var(--accent-amber)] text-black h-8 shrink-0"
                >
                  {savingPat ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                </Button>
              </div>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=AI-DRAKON"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[9px] text-[var(--accent-amber)] underline text-center hover:no-underline"
              >
                Створити токен на GitHub (scope: repo) →
              </a>
            </div>
          )}
          {!searching && searchError && searchError !== "__no_token__" && (
            <div className="py-3 text-center font-mono text-[11px] text-red-400">{searchError}</div>
          )}
          {!searching && searchResults.length > 0 && (
            <CommandGroup>
              {filteredRepos.map((repo) => (
                <CommandItem
                  key={repo.full_name}
                  value={repo.full_name}
                  onSelect={() => pickRepo(repo)}
                  className="flex flex-col items-start gap-0.5 cursor-pointer font-mono aria-selected:bg-white/5"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="flex-1 text-[12px] text-[var(--text-primary)]">{repo.full_name}</span>
                    {repo.private && (
                      <span className="text-[9px] px-1 rounded bg-[var(--border-subtle)] text-[var(--text-muted)]">private</span>
                    )}
                    {repo.language && (
                      <span className="text-[9px] text-[var(--text-muted)]">{repo.language}</span>
                    )}
                  </div>
                  {repo.description && (
                    <span className="text-[10px] text-[var(--text-muted)] truncate w-full">{repo.description}</span>
                  )}
                </CommandItem>
              ))}
              {filteredRepos.length === 0 && comboFilter !== "" && (
                <CommandItem
                  value={`__manual__${comboFilter}`}
                  onSelect={async () => { setRepoInput(comboFilter); setComboFilter(""); await searchRepo(); }}
                  className="font-mono text-[11px] cursor-pointer"
                >
                  Знайти «{comboFilter}» на GitHub →
                </CommandItem>
              )}
            </CommandGroup>
          )}
          {!searching && searchResults.length === 0 && !searchError && (
            <div className="py-4 text-center font-mono text-[10px] text-[var(--text-muted)]">
              Репозиторії не знайдено
            </div>
          )}
        </CommandList>
      </Command>

      {/* Ручний ввід owner/repo */}
      <div className="flex gap-2">
        <Input
          placeholder="owner/repo (вручну)"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void searchRepo()}
          className="font-mono text-[11px] bg-[var(--bg-base)] border-[var(--border-subtle)] h-9"
        />
        <Button
          size="sm"
          onClick={() => void searchRepo()}
          disabled={searching || !repoInput.trim()}
          className="font-mono text-[10px] bg-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/90 text-black h-9 shrink-0"
        >
          Знайти
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>}
</>
);
}

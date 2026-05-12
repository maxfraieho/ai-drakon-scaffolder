// Reusable "Project folder" form section used by editor save flow and by
// the analysis bind-to-folder card. Persists last values to local/session storage.

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ProjectFolderValue {
  folderSlug: string;
  repo: string;
  branch: string;
  saveToGit: boolean;
  githubToken: string;
}

const LS_FOLDER = "drakon_last_folder";
const LS_REPO = "drakon_last_repo";
const LS_BRANCH = "drakon_last_branch";
const SS_TOKEN = "drakon_gh_write_token";

export function readProjectFolderDefaults(): ProjectFolderValue {
  if (typeof window === "undefined") {
    return { folderSlug: "", repo: "", branch: "main", saveToGit: false, githubToken: "" };
  }
  return {
    folderSlug: localStorage.getItem(LS_FOLDER) || "",
    repo: localStorage.getItem(LS_REPO) || "",
    branch: localStorage.getItem(LS_BRANCH) || "main",
    saveToGit: false,
    githubToken: sessionStorage.getItem(SS_TOKEN) || "",
  };
}

interface Props {
  value: ProjectFolderValue;
  onChange: (next: ProjectFolderValue) => void;
  knownFolders?: string[];
  className?: string;
  compact?: boolean;
  hideFolder?: boolean;
}

export function ProjectFolderSection({
  value,
  onChange,
  knownFolders = [],
  className,
  compact = false,
  hideFolder = false,
}: Props) {
  const [showToken, setShowToken] = useState(false);

  // Persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value.folderSlug) localStorage.setItem(LS_FOLDER, value.folderSlug);
    if (value.repo) localStorage.setItem(LS_REPO, value.repo);
    if (value.branch) localStorage.setItem(LS_BRANCH, value.branch);
    if (value.githubToken) sessionStorage.setItem(SS_TOKEN, value.githubToken);
    else sessionStorage.removeItem(SS_TOKEN);
  }, [value]);

  const set = <K extends keyof ProjectFolderValue>(k: K, v: ProjectFolderValue[K]) =>
    onChange({ ...value, [k]: v });

  const dataListId = "drakon-folders-list";
  const repoEmpty = !value.repo.trim();

  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 space-y-2.5",
        compact && "p-2.5 space-y-2",
        className,
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        Project folder
      </div>

      <div className={cn("grid gap-2.5", compact ? "" : "md:grid-cols-3")}>
        {!hideFolder && (
          <div className="space-y-1">
            <Label htmlFor="pf-folder" className="text-xs">Folder (MinIO)</Label>
            <Input
              id="pf-folder"
              list={dataListId}
              value={value.folderSlug}
              onChange={(e) => set("folderSlug", e.target.value)}
              placeholder="my-project"
              className="h-8 text-sm"
            />
            <datalist id={dataListId}>
              {knownFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="pf-repo" className="text-xs">GitHub repo</Label>
          <Input
            id="pf-repo"
            value={value.repo}
            onChange={(e) => set("repo", e.target.value)}
            placeholder="owner/repo"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pf-branch" className="text-xs">Branch</Label>
          <Input
            id="pf-branch"
            value={value.branch}
            onChange={(e) => set("branch", e.target.value)}
            placeholder="main"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="pf-save-git"
          checked={value.saveToGit}
          disabled={repoEmpty}
          onCheckedChange={(c) => set("saveToGit", c === true)}
        />
        <Label
          htmlFor="pf-save-git"
          className={cn("text-xs cursor-pointer", repoEmpty && "opacity-50 cursor-not-allowed")}
        >
          Save to git
        </Label>
      </div>

      {value.saveToGit && (
        <div className="space-y-1">
          <Label htmlFor="pf-token" className="text-xs">
            GitHub write token (repo scope)
          </Label>
          <div className="relative">
            <Input
              id="pf-token"
              type={showToken ? "text" : "password"}
              value={value.githubToken}
              onChange={(e) => set("githubToken", e.target.value)}
              placeholder="ghp_…"
              className="h-8 text-sm pr-8 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "Hide token" : "Show token"}
              className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Stored only in this browser tab session.
          </p>
        </div>
      )}
    </div>
  );
}

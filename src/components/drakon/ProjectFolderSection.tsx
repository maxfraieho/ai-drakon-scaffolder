// Reusable "Project folder" section — persists folder slug + saveToGit flag.
// Token / repo / branch are taken from global Settings automatically.

import { useEffect, useState } from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { readSettings } from "@/lib/settings-storage";

export interface ProjectFolderValue {
  folderSlug: string;
  saveToGit: boolean;
}

const LS_FOLDER = "drakon_last_folder";
const LS_SAVE_GIT = "drakon_save_to_git";
const LS_PF_OPEN = "drakon_pf_open";

export function readProjectFolderDefaults(): ProjectFolderValue {
  if (typeof window === "undefined") {
    return { folderSlug: "", saveToGit: false };
  }
  return {
    folderSlug: localStorage.getItem(LS_FOLDER) || readSettings().app.defaultFolder || "",
    saveToGit: localStorage.getItem(LS_SAVE_GIT) === "1",
  };
}

interface Props {
  value: ProjectFolderValue;
  onChange: (next: ProjectFolderValue) => void;
  knownFolders?: string[];
  className?: string;
}

export function ProjectFolderSection({
  value,
  onChange,
  knownFolders = [],
  className,
}: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_PF_OPEN) === "1";
  });

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem(LS_PF_OPEN, next ? "1" : "0");
      return next;
    });
  };

  // Persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value.folderSlug) localStorage.setItem(LS_FOLDER, value.folderSlug);
    localStorage.setItem(LS_SAVE_GIT, value.saveToGit ? "1" : "0");
  }, [value]);

  const set = <K extends keyof ProjectFolderValue>(k: K, v: ProjectFolderValue[K]) =>
    onChange({ ...value, [k]: v });

  const dataListId = "drakon-folders-list";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
        className,
      )}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 gap-2 select-none",
          "hover:bg-[var(--bg-surface)] transition-colors",
          open ? "rounded-t-[var(--radius-sm)]" : "rounded-[var(--radius-sm)]",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] shrink-0">
            {value.folderSlug || "folder"}
          </span>
          {value.saveToGit && !open && (
            <span className="text-[10px] text-green-500 shrink-0">· git</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-3 pb-3 pt-2.5 space-y-2.5 border-t border-[var(--border-subtle)]">
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="pf-save-git"
              checked={value.saveToGit}
              onCheckedChange={(c) => set("saveToGit", c === true)}
            />
            <Label htmlFor="pf-save-git" className="text-xs cursor-pointer">
              Save to git
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}

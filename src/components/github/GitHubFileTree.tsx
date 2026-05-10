import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type GitHubEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
};

type GitHubFileTreeProps = {
  owner: string;
  repo: string;
  branch?: string;
  onSelectPath: (path: string, type: "file" | "dir") => void;
  onAnalyzeFolder: (path: string) => void;
};

function iconForFile(name: string) {
  if (name.endsWith(".tsx")) return "⚛️";
  if (name.endsWith(".ts")) return "🔷";
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "🟨";
  if (name.endsWith(".json")) return "🧩";
  return "📄";
}

export function GitHubFileTree({ owner, repo, branch = "main", onSelectPath, onAnalyzeFolder }: GitHubFileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [nodesByPath, setNodesByPath] = useState<Record<string, GitHubEntry[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();

  const canLoad = useMemo(() => normalizedOwner.length > 0 && normalizedRepo.length > 0, [normalizedOwner, normalizedRepo]);

  const loadPath = async (path: string) => {
    if (!canLoad || loadingPaths[path]) return;

    setLoadingPaths((prev) => ({ ...prev, [path]: true }));
    setError(null);
    try {
      const response = await api.githubListTree(normalizedOwner, normalizedRepo, path, branch);
      if (!response.success) {
        throw new Error("Не вдалося завантажити дерево GitHub");
      }

      const sorted = [...(response.entries || [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setNodesByPath((prev) => ({ ...prev, [path]: sorted }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Помилка GitHub API";
      setError(
        message.includes("GITHUB_TOKEN")
          ? "GITHUB_TOKEN не налаштований у Worker. Додай secret і повтори спробу."
          : message,
      );
    } finally {
      setLoadingPaths((prev) => ({ ...prev, [path]: false }));
    }
  };

  useEffect(() => {
    setExpanded({});
    setNodesByPath({});
    setError(null);
    if (canLoad) {
      void loadPath("");
    }
  }, [canLoad, normalizedOwner, normalizedRepo, branch]);

  const toggleDir = (path: string) => {
    const nextExpanded = !expanded[path];
    setExpanded((prev) => ({ ...prev, [path]: nextExpanded }));
    if (nextExpanded && !nodesByPath[path]) {
      void loadPath(path);
    }
    onSelectPath(path, "dir");
  };

  const renderEntries = (path: string, depth: number) => {
    const entries = nodesByPath[path] || [];

    return entries.map((entry) => {
      const isDir = entry.type === "dir";
      const isOpen = expanded[entry.path];

      return (
        <div key={entry.path} className="space-y-1">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 14}px` }}>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-foreground"
              onClick={() => {
                if (isDir) {
                  toggleDir(entry.path);
                } else {
                  onSelectPath(entry.path, "file");
                }
              }}
            >
              <span>{isDir ? "📁" : iconForFile(entry.name)}</span>
              <span className="truncate">{entry.name}</span>
            </button>

            {isDir ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => onAnalyzeFolder(entry.path)}
                >
                  🔍 Аналізувати
                </Button>
                <span className="text-xs text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
              </>
            ) : null}
          </div>

          {isDir && isOpen ? (
            <div>
              {loadingPaths[entry.path] ? (
                <div className="space-y-1 pl-8">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ) : (
                renderEntries(entry.path, depth + 1)
              )}
            </div>
          ) : null}
        </div>
      );
    });
  };

  if (!canLoad) {
    return <p className="text-sm text-muted-foreground">Вкажіть owner/repo для завантаження дерева.</p>;
  }

  if (loadingPaths[""] && !nodesByPath[""]) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      <div className="space-y-1">{renderEntries("", 0)}</div>
    </div>
  );
}
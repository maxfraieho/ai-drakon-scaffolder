import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Bot,
  FilePenLine,
  FolderPlus,
  GitBranch,
  GitMerge,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { GitHubPanel } from "@/components/github/GitHubPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { findDiagramsByFilePath } from "@/lib/htse/diagram-context";
import {
  readDiagramsFromStorage,
  removeDiagramFromStorage,
  upsertDiagramInStorage,
} from "@/lib/diagram-storage";
import {
  DEFAULT_FOLDER,
  readFoldersFromStorage,
  slugifyFolderName,
  writeFoldersToStorage,
  type Folder,
} from "@/lib/folder-storage";
import type { CodebaseAnalysisRequest } from "@/types/analysis";
import type { Diagram } from "@/types/drakon";

function readLastGithubRepoSelection() {
  if (typeof window === "undefined") {
    return { owner: "maxfraieho", repo: "drakon-setup-hub", branch: "main" };
  }

  try {
    const raw = localStorage.getItem("github.lastRepo");
    if (!raw) {
      return { owner: "maxfraieho", repo: "drakon-setup-hub", branch: "main" };
    }

    const parsed = JSON.parse(raw) as Partial<{ owner: string; repo: string; branch: string }>;
    return {
      owner: parsed.owner || "maxfraieho",
      repo: parsed.repo || "drakon-setup-hub",
      branch: parsed.branch || "main",
    };
  } catch {
    return { owner: "maxfraieho", repo: "drakon-setup-hub", branch: "main" };
  }
}

export function DiagramsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    autoAnalyze?: string;
    analyzePath?: string;
    analyzeRepo?: string;
    analyzeBranch?: string;
  };
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [folders, setFolders] = useState<Folder[]>(() => readFoldersFromStorage());
  const [selectedFolderSlug, setSelectedFolderSlug] = useState<string>(
    () => readFoldersFromStorage()[0]?.slug || "general",
  );
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoadingDiagrams, setIsLoadingDiagrams] = useState(false);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMobileFoldersOpen, setIsMobileFoldersOpen] = useState(false);
  const [foldersCollapsed, setFoldersCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("drakon.foldersCollapsed") === "1";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("drakon.foldersCollapsed", foldersCollapsed ? "1" : "0");
    }
  }, [foldersCollapsed]);
  const [newFolderName, setNewFolderName] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "L0" | "L1" | "L2" | "L3">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "human" | "ai" | "hybrid">("all");
  const [filePathFilter, setFilePathFilter] = useState("");

  const [isGitHubOpen, setIsGitHubOpen] = useState(false);
  const [selectedGitHubPath, setSelectedGitHubPath] = useState<string>("");
  const [selectedGitHubType, setSelectedGitHubType] = useState<"file" | "dir" | null>(null);
  const [selectedGitHubPreview, setSelectedGitHubPreview] = useState<string>("");

  const [isSaveToGithubOpen, setIsSaveToGithubOpen] = useState(false);
  const [githubTargetPath, setGithubTargetPath] = useState("");
  const [diagramForGithubSave, setDiagramForGithubSave] = useState<Diagram | null>(null);
  const [isCommittingToGithub, setIsCommittingToGithub] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [analyzeDraft, setAnalyzeDraft] = useState<CodebaseAnalysisRequest>({
    projectName: "",
    sourceType: "text-paste",
    sourceContent: "",
    language: "auto",
    analysisDepth: "modules",
    entryPaths: ["src"],
    includeGlobs: ["**/*.{ts,tsx,js,jsx,json}"],
    excludeGlobs: ["node_modules/**", "dist/**"],
  });
  const autoAnalyzeHandledRef = useRef(false);

  const selectedFolder =
    folders.find((folder) => folder.slug === selectedFolderSlug) ?? DEFAULT_FOLDER;

  const folderDiagrams = useMemo(
    () => diagrams.filter((diagram) => diagram.folderId === selectedFolder.slug),
    [diagrams, selectedFolder.slug],
  );

  const filteredDiagrams = useMemo(() => {
    let next = [...folderDiagrams];

    if (levelFilter !== "all") {
      next = next.filter((diagram) => diagram.diagram.metadata?.diagramLevel === levelFilter);
    }

    if (sourceFilter !== "all") {
      next = next.filter((diagram) => (diagram.diagram.metadata?.sourceType ?? "human") === sourceFilter);
    }

    if (filePathFilter.trim()) {
      next = findDiagramsByFilePath(filePathFilter, next);
    }

    return next;
  }, [filePathFilter, folderDiagrams, levelFilter, sourceFilter]);

  const loadDiagrams = async (folderSlug: string) => {
    const local = readDiagramsFromStorage().filter((d) => d.folderId === folderSlug);
    setDiagrams(local);
    setIsLoadingDiagrams(true);

    try {
      const result = await api.listDiagrams(folderSlug);
      const remoteIds = result.diagrams ?? [];

      if (result.success && remoteIds.length > 0) {
        const localIds = new Set(local.map((d) => d.id));
        const missingIds = remoteIds.filter((id) => !localIds.has(id));

        for (const id of missingIds) {
          try {
            const remote = await api.getDiagram(folderSlug, id);
            if (remote.success && remote.diagram) {
              upsertDiagramInStorage(remote.diagram);
            }
          } catch {
            // no-op: remote diagram might be unavailable, keep local copy
          }
        }

        const refreshed = readDiagramsFromStorage().filter((d) => d.folderId === folderSlug);
        setDiagrams(refreshed);
      }
    } catch {
      // no-op: fallback to locally cached diagrams
    } finally {
      setIsLoadingDiagrams(false);
    }
  };

  useEffect(() => {
    void loadDiagrams(selectedFolder.slug);
  }, [selectedFolder.slug]);

  const createFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      toast.error("Вкажіть назву папки");
      return;
    }

    const slug = slugifyFolderName(trimmed);
    if (!slug) {
      toast.error("Некоректна назва папки");
      return;
    }

    if (folders.some((folder) => folder.slug === slug)) {
      toast.error("Папка з таким slug вже існує");
      return;
    }

    const folder: Folder = {
      id: crypto.randomUUID(),
      name: trimmed,
      slug,
    };

    const next = [...folders, folder];
    setFolders(next);
    writeFoldersToStorage(next);
    setSelectedFolderSlug(folder.slug);
    setNewFolderName("");
    setIsCreateFolderOpen(false);
  };

  const openDiagram = (diagram: Diagram) => {
    navigate({
      to: "/diagram/editor",
      search: {
        diagramId: diagram.id,
        folderId: selectedFolder.slug,
      },
    });
  };

  const openNewDiagram = () => {
    navigate({
      to: "/diagram/editor",
      search: {
        folderId: selectedFolder.slug,
        isNew: "true",
      },
    });
  };

  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Diagram["diagram"];
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const name =
        (parsed as { name?: string }).name ||
        file.name.replace(/\.(drakon\.)?json$/i, "") ||
        "Imported diagram";

      await api.saveDiagram(selectedFolder.slug, id, parsed);

      const stored: Diagram = {
        id,
        folderId: selectedFolder.slug,
        name,
        createdAt: now,
        updatedAt: now,
        diagram: {
          ...parsed,
          name,
          items: parsed.items ?? {},
        },
      };

      upsertDiagramInStorage(stored);
      setDiagrams((prev) => [stored, ...prev]);
      toast.success("Diagram imported successfully");
    } catch {
      toast.error("Помилка імпорту JSON");
    } finally {
      event.target.value = "";
    }
  };

  const deleteDiagram = async (diagram: Diagram) => {
    removeDiagramFromStorage(diagram.id);
    setDiagrams((prev) => prev.filter((item) => item.id !== diagram.id));

    try {
      await api.deleteDiagram(diagram.folderId, diagram.id);
      toast.success("Схему видалено");
    } catch {
      toast.success("Схему видалено локально");
    }
  };

  const openAnalyzeDialog = (path: string, sourceContent?: string) => {
    const cleanPath = path || "src";
    const projectName = cleanPath.split("/").filter(Boolean).pop() || "github-entry";
    setAnalyzeDraft({
      projectName,
      sourceType: "text-paste",
      sourceContent: sourceContent || `GitHub entry selected for analysis: ${cleanPath}`,
      language: "auto",
      analysisDepth: "modules",
      entryPaths: [cleanPath],
      includeGlobs: ["**/*.{ts,tsx,js,jsx,json}"],
      excludeGlobs: ["node_modules/**", "dist/**"],
    });
    setIsAnalyzeOpen(true);
  };

  const handleAnalyzeFolder = async (path: string) => {
    openAnalyzeDialog(path || "src");
  };

  useEffect(() => {
    const shouldAutoAnalyze = search.autoAnalyze === "true";
    const analyzePath = search.analyzePath?.trim();

    if (!shouldAutoAnalyze || !analyzePath || autoAnalyzeHandledRef.current) {
      return;
    }

    autoAnalyzeHandledRef.current = true;
    openAnalyzeDialog(analyzePath, `GitHub entry selected for analysis: ${analyzePath}`);
    navigate({ to: "/diagrams" });
  }, [navigate, search.analyzePath, search.autoAnalyze]);

  const submitAnalyzeDraft = async () => {
    try {
      const { jobId } = await api.analyzeCodebase(analyzeDraft);
      toast.success(`Аналіз запущено (job: ${jobId})`);
      setIsAnalyzeOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося запустити аналіз");
    }
  };

  const handleSelectGithubPath = async (path: string, type: "file" | "dir") => {
    setSelectedGitHubPath(path);
    setSelectedGitHubType(type);

    if (type !== "file" || !/\.(ts|tsx|js|jsx|json)$/i.test(path)) {
      setSelectedGitHubPreview("");
      return;
    }

    const repoSelection = readLastGithubRepoSelection();
    try {
      const file = await api.githubGetFile(
        repoSelection.owner,
        repoSelection.repo,
        path,
        repoSelection.branch,
      );

      if (!file.success) {
        throw new Error("Не вдалося прочитати файл");
      }

      setSelectedGitHubPreview(file.content.slice(0, 1500));
    } catch (error) {
      setSelectedGitHubPreview("");
      toast.error(error instanceof Error ? error.message : "Помилка preview файлу");
    }
  };

  const openSaveToGithubDialog = (diagram: Diagram) => {
    const defaultPath = `diagrams/${diagram.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9а-яіїєґ-_]/gi, "")}.json`;

    setDiagramForGithubSave(diagram);
    setGithubTargetPath(defaultPath);
    setIsSaveToGithubOpen(true);
  };

  const commitDiagramToGithub = async () => {
    if (!diagramForGithubSave || !githubTargetPath.trim()) {
      toast.error("Вкажіть шлях для файлу в GitHub");
      return;
    }

    const repoSelection = readLastGithubRepoSelection();
    setIsCommittingToGithub(true);

    try {
      const response = await api.githubCommitFile(
        repoSelection.owner,
        repoSelection.repo,
        githubTargetPath.trim(),
        JSON.stringify(diagramForGithubSave.diagram, null, 2),
        `chore(diagrams): save ${diagramForGithubSave.name}`,
        repoSelection.branch,
      );

      if (!response.success) {
        throw new Error("GitHub commit failed");
      }

      toast.success("Схему збережено в GitHub");
      setIsSaveToGithubOpen(false);
      setDiagramForGithubSave(null);
      setGithubTargetPath("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося зберегти в GitHub");
    } finally {
      setIsCommittingToGithub(false);
    }
  };

  const totalInFolder = folderDiagrams.length;
  const visibleCount = filteredDiagrams.length;

  const levelTabs: Array<"all" | "L1" | "L2" | "L3"> = ["all", "L1", "L2", "L3"];

  return (
    <Sheet open={isMobileFoldersOpen} onOpenChange={setIsMobileFoldersOpen}>
      <div className="flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <SheetContent side="left" className="w-72 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <SheetHeader>
            <SheetTitle className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Folders
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  setSelectedFolderSlug(folder.slug);
                  setIsMobileFoldersOpen(false);
                }}
                className={cn(
                  "w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors",
                  folder.slug === selectedFolder.slug
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-l-2 border-[var(--accent-amber)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                )}
              >
                {folder.name}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full"
            type="button"
            onClick={() => {
              setIsCreateFolderOpen(true);
              setIsMobileFoldersOpen(false);
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            New folder
          </Button>
        </SheetContent>

        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] md:block",
            foldersCollapsed ? "w-0 border-r-0" : "w-60",
          )}
          style={{ transitionProperty: "width", transitionDuration: "200ms" }}
          aria-hidden={foldersCollapsed}
        >
          {!foldersCollapsed && (
            <>
              <div className="sticky top-0 flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Folders
                </span>
                <button
                  type="button"
                  onClick={() => setFoldersCollapsed(true)}
                  aria-label="Згорнути папки"
                  title="Згорнути"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <nav className="p-2">
                <ul className="space-y-0.5" role="list">
                  {folders.map((folder) => {
                    const isActive = folder.slug === selectedFolder.slug;
                    return (
                      <li key={folder.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedFolderSlug(folder.slug)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group relative flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                            isActive
                              ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[var(--accent-amber)]"
                            />
                          )}
                          <span className="ml-1 truncate">{folder.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(true)}
                  className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-default)] px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  New folder
                </button>
              </nav>
            </>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* HEADER BAR */}
          <header
            className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 md:px-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open folders menu"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
            </SheetTrigger>

            {/* Desktop: collapse/expand folders sidebar */}
            <button
              type="button"
              onClick={() => setFoldersCollapsed((v) => !v)}
              aria-label={foldersCollapsed ? "Показати папки" : "Сховати папки"}
              aria-pressed={!foldersCollapsed}
              title={foldersCollapsed ? "Показати папки" : "Сховати папки"}
              className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
            >
              {foldersCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Diagrams
              </span>
              <span className="hidden font-mono text-xs text-[var(--text-muted)] md:inline">/</span>
              <span className="hidden truncate font-mono text-xs text-[var(--text-secondary)] md:inline">
                {selectedFolder.name}
              </span>
            </div>

            <div className="relative ml-auto hidden md:block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={filePathFilter}
                onChange={(event) => setFilePathFilter(event.target.value)}
                placeholder="Search by file path…"
                aria-label="Search diagrams"
                className="w-56 border-0 border-b border-[var(--border-default)] bg-transparent py-1 pl-7 pr-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-amber)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 ml-auto md:ml-0">
              <span
                className="hidden font-mono text-[11px] tabular-nums text-[var(--text-muted)] sm:inline"
                data-numeric="true"
              >
                {visibleCount} / {totalInFolder}
              </span>

              <input
                ref={importInputRef}
                type="file"
                accept=".json,.drakon.json"
                className="hidden"
                onChange={handleImportJson}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="hidden rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-transparent px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 md:inline-flex"
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/github" })}
                aria-label="Open GitHub files"
                className="hidden h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 md:inline-flex"
              >
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={openNewDiagram}
                aria-label="Create new diagram"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-amber)] px-3 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-black active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                style={{ transition: "transform 100ms, box-shadow 150ms" }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                New
              </button>
            </div>
          </header>

          {/* LEVEL TABS */}
          <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 md:px-6">
            {levelTabs.map((level) => {
              const label = level === "all" ? "ALL" : level;
              const isActive = levelFilter === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setLevelFilter(level)}
                  className={cn(
                    "relative -mb-px border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:rounded-sm",
                    isActive
                      ? "border-[var(--accent-amber)] text-[var(--text-primary)]"
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  {label}
                </button>
              );
            })}

            {/* Source filter (compact) */}
            <div className="ml-auto flex items-center gap-2 py-1.5">
              <span className="hidden font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] sm:inline">
                Source
              </span>
              <Select
                value={sourceFilter}
                onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}
              >
                <SelectTrigger className="h-7 w-[110px] border-[var(--border-default)] bg-transparent text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="human">human</SelectItem>
                  <SelectItem value="ai">ai</SelectItem>
                  <SelectItem value="hybrid">hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 xl:flex-row">
            {isGitHubOpen ? (
              <aside className="w-full xl:max-w-sm">
                <GitHubPanel onSelectPath={handleSelectGithubPath} onAnalyzeFolder={handleAnalyzeFolder} />

                {selectedGitHubPath ? (
                  <Card
                    className="mt-3 border-0 bg-[var(--bg-surface)]"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm">Selected path</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="font-mono text-xs text-[var(--text-secondary)]">
                        {selectedGitHubType}: <span className="text-[var(--text-primary)]">{selectedGitHubPath}</span>
                      </p>
                      {selectedGitHubPreview ? (
                        <pre className="max-h-56 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] p-2 text-xs">
                          {selectedGitHubPreview}
                        </pre>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </aside>
            ) : null}

            <section className="min-w-0 flex-1">
              {filteredDiagrams.length === 0 && !isLoadingDiagrams ? (
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    No diagrams found
                  </span>
                  <p className="text-sm text-[var(--text-muted)]">
                    Create your first diagram to begin
                  </p>
                  <button
                    type="button"
                    onClick={openNewDiagram}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent-amber)] px-4 py-2 text-sm font-medium text-black active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                    style={{ transition: "transform 100ms" }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create diagram
                  </button>
                </div>
              ) : (
                <ul
                  role="list"
                  className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
                >
                  {filteredDiagrams.map((diagram, index) => {
                    const level = diagram.diagram.metadata?.diagramLevel ?? "unknown";
                    const source = diagram.diagram.metadata?.sourceType ?? "human";
                    const itemCount = diagram.diagram.items
                      ? Object.keys(diagram.diagram.items).length
                      : 0;
                    const updatedRel = formatDistanceToNow(new Date(diagram.updatedAt), {
                      addSuffix: true,
                    });

                    return (
                      <li
                        key={diagram.id}
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
                        style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openDiagram(diagram)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openDiagram(diagram);
                            }
                          }}
                          aria-label={`Open ${diagram.name}`}
                          className="group relative cursor-pointer rounded-[var(--radius-md)] bg-[var(--bg-surface)] p-4 transition-colors duration-150 hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                          style={{ boxShadow: "var(--shadow-card)" }}
                        >
                          {/* Top row: level + source */}
                          <div className="flex items-center gap-2">
                            <span className="level-badge" data-level={level}>
                              {level}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
                              aria-label={`Source: ${source}`}
                            >
                              {source === "human" ? (
                                <FilePenLine className="h-3 w-3" aria-hidden="true" />
                              ) : source === "ai" ? (
                                <Bot className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <GitMerge className="h-3 w-3" aria-hidden="true" />
                              )}
                              {source}
                            </span>
                          </div>

                          {/* Name */}
                          <h3
                            className="mt-3 truncate font-mono text-sm font-medium text-[var(--text-primary)]"
                            style={{ textWrap: "balance" }}
                            title={diagram.name}
                          >
                            {diagram.name}
                          </h3>

                          {/* Metadata row */}
                          <div
                            className="mt-2 flex items-center gap-3 font-mono text-[11px] text-[var(--text-muted)]"
                            data-numeric="true"
                          >
                            <span title={diagram.id}>{diagram.id.slice(0, 8)}</span>
                            <span aria-label={`${itemCount} nodes`}>{itemCount}n</span>
                            <span>{updatedRel}</span>
                          </div>

                          {/* Hover actions */}
                          <div
                            className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label={`Edit ${diagram.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDiagram(diagram);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                              style={{ transition: "transform 100ms, background-color 150ms" }}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Save ${diagram.name} to GitHub`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openSaveToGithubDialog(diagram);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                              style={{ transition: "transform 100ms, background-color 150ms" }}
                            >
                              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Delete ${diagram.name}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-red-400 hover:bg-red-500/10 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                  style={{ transition: "transform 100ms, background-color 150ms" }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete diagram?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteDiagram(diagram)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

        </main>

        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create folder</DialogTitle>
            </DialogHeader>
            <Input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Folder name"
            />
            <DialogFooter>
              <Button type="button" onClick={createFolder}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAnalyzeOpen} onOpenChange={setIsAnalyzeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Code analysis</DialogTitle>
              <DialogDescription>Verify parameters before launch</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={analyzeDraft.projectName}
                onChange={(event) =>
                  setAnalyzeDraft((prev) => ({
                    ...prev,
                    projectName: event.target.value,
                  }))
                }
                placeholder="Project name"
              />

              <Input value={analyzeDraft.sourceType} readOnly />

              <Input
                value={analyzeDraft.entryPaths[0] || ""}
                onChange={(event) =>
                  setAnalyzeDraft((prev) => ({
                    ...prev,
                    entryPaths: [event.target.value],
                  }))
                }
                placeholder="Entry path"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAnalyzeOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitAnalyzeDraft}>
                Run analysis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSaveToGithubOpen} onOpenChange={setIsSaveToGithubOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save diagram to GitHub</DialogTitle>
              <DialogDescription>
                Specify a repository path, e.g. diagrams/flow-name.json
              </DialogDescription>
            </DialogHeader>
            <Input
              value={githubTargetPath}
              onChange={(event) => setGithubTargetPath(event.target.value)}
              placeholder="diagrams/flow-name.json"
            />
            <DialogFooter>
              <Button type="button" onClick={commitDiagramToGithub} disabled={isCommittingToGithub}>
                {isCommittingToGithub ? "Saving…" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Sheet>
  );
}

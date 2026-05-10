import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bot, FilePenLine, FolderPlus, GitMerge, Menu } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
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

  const handleAnalyzeFolder = async (path: string) => {
    const request: CodebaseAnalysisRequest = {
      projectName: path || "github-root",
      sourceType: "text-paste",
      sourceContent: `GitHub folder selected for analysis: ${path || "/"}`,
      language: "auto",
      analysisDepth: "modules",
      entryPaths: [path || "src/"],
      includeGlobs: ["**/*.{ts,tsx,js,jsx,json}"],
      excludeGlobs: ["node_modules/**", "dist/**"],
    };

    try {
      const { jobId } = await api.analyzeCodebase(request);
      toast.success(`Аналіз запущено (job: ${jobId})`);
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

  return (
    <Sheet open={isMobileFoldersOpen} onOpenChange={setIsMobileFoldersOpen}>
      <div className="flex min-h-screen bg-background text-foreground">
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader>
            <SheetTitle>Проєктні папки</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={folder.slug === selectedFolder.slug ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedFolderSlug(folder.slug);
                  setIsMobileFoldersOpen(false);
                }}
              >
                {folder.name}
              </Button>
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
            <FolderPlus className="mr-2 h-4 w-4" />
            Нова папка
          </Button>
        </SheetContent>

        <aside className="hidden w-64 border-r border-border bg-card p-4 md:block">
          <h2 className="text-base font-semibold">Папки</h2>

          <div className="mt-4 space-y-2">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={folder.slug === selectedFolder.slug ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedFolderSlug(folder.slug)}
              >
                {folder.name}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full"
            type="button"
            onClick={() => setIsCreateFolderOpen(true)}
          >
            + Нова папка
          </Button>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2 md:hidden">
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <Menu className="mr-2 h-4 w-4" />
                Меню папок
              </Button>
            </SheetTrigger>
            <p className="text-sm text-muted-foreground">{selectedFolder.name}</p>
          </div>

          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{selectedFolder.name}</h1>

            <div className="flex items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".json,.drakon.json"
                className="hidden"
                onChange={handleImportJson}
              />
              <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
                Import JSON
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsGitHubOpen((prev) => !prev)}>
                📂 GitHub
              </Button>
              <Button type="button" onClick={openNewDiagram}>
                + Нова схема
              </Button>
            </div>
          </div>

          <div className="mb-4 grid gap-2 md:grid-cols-3">
            <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as typeof levelFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="L0">L0</SelectItem>
                <SelectItem value="L1">L1</SelectItem>
                <SelectItem value="L2">L2</SelectItem>
                <SelectItem value="L3">L3</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="human">human</SelectItem>
                <SelectItem value="ai">ai</SelectItem>
                <SelectItem value="hybrid">hybrid</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={filePathFilter}
              onChange={(event) => setFilePathFilter(event.target.value)}
              placeholder="Filter by file path"
            />
          </div>

          <div className="flex flex-col gap-4 xl:flex-row">
            {isGitHubOpen ? (
              <aside className="w-full xl:max-w-sm">
                <GitHubPanel onSelectPath={handleSelectGithubPath} onAnalyzeFolder={handleAnalyzeFolder} />

                {selectedGitHubPath ? (
                  <Card className="mt-3 border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-sm">Вибраний шлях</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedGitHubType}: <span className="text-foreground">{selectedGitHubPath}</span>
                      </p>
                      {selectedGitHubPreview ? (
                        <pre className="max-h-56 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-xs">
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
                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                  <p className="text-lg">Схем поки немає</p>
                  <p className="mt-1 text-sm">Натисніть "+ Нова схема" щоб створити першу</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {filteredDiagrams.map((diagram) => (
                    <Card key={diagram.id} className="border-border bg-card">
                      <CardHeader>
                        <CardTitle className="text-base">{diagram.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{diagram.diagram.metadata?.diagramLevel ?? "unknown"}</Badge>
                          <Badge variant="secondary" className="gap-1">
                            {(diagram.diagram.metadata?.sourceType ?? "human") === "human" ? (
                              <FilePenLine className="h-3.5 w-3.5" />
                            ) : (diagram.diagram.metadata?.sourceType ?? "human") === "ai" ? (
                              <Bot className="h-3.5 w-3.5" />
                            ) : (
                              <GitMerge className="h-3.5 w-3.5" />
                            )}
                            {diagram.diagram.metadata?.sourceType ?? "human"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Створено: {format(new Date(diagram.createdAt), "dd.MM.yyyy HH:mm")}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" onClick={() => openDiagram(diagram)}>
                            Відкрити
                          </Button>
                          <Button type="button" variant="outline" onClick={() => openSaveToGithubDialog(diagram)}>
                            Зберегти в GitHub
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" type="button">
                                Видалити
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Видалити схему?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Цю дію неможливо скасувати.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDiagram(diagram)}>
                                  Видалити
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>

        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Створити папку</DialogTitle>
            </DialogHeader>
            <Input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Назва папки"
            />
            <DialogFooter>
              <Button type="button" onClick={createFolder}>
                Створити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSaveToGithubOpen} onOpenChange={setIsSaveToGithubOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Зберегти схему в GitHub</DialogTitle>
              <DialogDescription>
                Вкажіть шлях у репозиторії, наприклад: diagrams/flow-name.json
              </DialogDescription>
            </DialogHeader>
            <Input
              value={githubTargetPath}
              onChange={(event) => setGithubTargetPath(event.target.value)}
              placeholder="diagrams/flow-name.json"
            />
            <DialogFooter>
              <Button type="button" onClick={commitDiagramToGithub} disabled={isCommittingToGithub}>
                {isCommittingToGithub ? "Збереження..." : "Підтвердити"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Sheet>
  );
}

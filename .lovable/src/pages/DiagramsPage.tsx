import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import {
  readDiagramsFromStorage,
  removeDiagramFromStorage,
  upsertDiagramInStorage,
} from "@/lib/diagram-storage";
import { useDiagramStore } from "@/store/useDiagramStore";
import type { AnalysisJob, CodebaseAnalysisRequest } from "@/types/analysis";
import type { Diagram, GenerateResult } from "@/types/drakon";

type Folder = { id: string; name: string };

const FOLDERS_STORAGE_KEY = "drakon.folders";
const MOBILE_FOLDERS_COLLAPSED_KEY = "drakon.mobileFoldersCollapsed";

const defaultFolders: Folder[] = [{ id: "default", name: "Загальні" }];

function readFoldersFromStorage(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) return defaultFolders;

    const parsed = JSON.parse(raw) as Folder[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultFolders;
    }

    const hasDefault = parsed.some((folder) => folder.id === "default");
    return hasDefault ? parsed : [...defaultFolders, ...parsed];
  } catch {
    return defaultFolders;
  }
}

function writeFoldersToStorage(folders: Folder[]) {
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

function slugifyFolderId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яіїєґ-]/gi, "")
    .replace(/-+/g, "-");
}

export function DiagramsPage() {
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { setDiagram, setMetrics } = useDiagramStore();

  const [folders, setFolders] = useState<Folder[]>(() =>
    typeof window === "undefined" ? defaultFolders : readFoldersFromStorage(),
  );
  const [selectedFolderId, setSelectedFolderId] = useState("default");
  const [diagrams, setDiagrams] = useState<Diagram[]>(() => readDiagramsFromStorage());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInput, setNewInput] = useState("");
  const [newInputType, setNewInputType] = useState<"text" | "code">("text");
  const [isLoadingDiagrams, setIsLoadingDiagrams] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [analysisProjectName, setAnalysisProjectName] = useState("");
  const [analysisLanguage, setAnalysisLanguage] = useState<"typescript" | "javascript" | "auto">(
    "typescript",
  );
  const [analysisDepth, setAnalysisDepth] = useState<
    "overview" | "modules" | "flows" | "procedures"
  >("modules");
  const [analysisInput, setAnalysisInput] = useState("");
  const [analysisEntryPaths, setAnalysisEntryPaths] = useState("src/, cloudflare-worker/");
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isMobileFoldersCollapsed, setIsMobileFoldersCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;

    try {
      return localStorage.getItem(MOBILE_FOLDERS_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const selectedFolder =
    folders.find((folder) => folder.id === selectedFolderId) ??
    ({ id: "default", name: "Загальні" } as Folder);

  const folderDiagrams = useMemo(
    () => diagrams.filter((diagram) => diagram.folderId === selectedFolderId),
    [diagrams, selectedFolderId],
  );

  const loadDiagrams = async (folderId: string) => {
    const local = readDiagramsFromStorage();
    setDiagrams(local.filter((d) => d.folderId === folderId));
    setIsLoadingDiagrams(true);

    try {
      const result = await api.listDiagrams(folderId);
      const remoteIds = result.diagrams ?? [];
      if (result.success && remoteIds.length > 0) {
        const localIds = new Set(local.map((d) => d.id));
        const missing = remoteIds.filter((id: string) => !localIds.has(id));

        for (const id of missing) {
          try {
            const remote = await api.getDiagram(folderId, id);
            if (remote.success && remote.diagram) {
              upsertDiagramInStorage(remote.diagram);
              setDiagrams((prev) => [
                remote.diagram as Diagram,
                ...prev.filter((d) => d.id !== id),
              ]);
            }
          } catch {
            // ignore per-diagram fetch errors and continue loading others
          }
        }
      }
    } catch {
      // ignore remote listing failures; local diagrams are already shown
    } finally {
      setIsLoadingDiagrams(false);
    }
  };

  useEffect(() => {
    void loadDiagrams(selectedFolderId);
  }, [selectedFolderId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(MOBILE_FOLDERS_COLLAPSED_KEY, isMobileFoldersCollapsed ? "1" : "0");
  }, [isMobileFoldersCollapsed]);

  const resetGenerationDialog = () => {
    setNewName("");
    setNewInput("");
    setNewInputType("text");
    setGenerateResult(null);
    setIsGenerating(false);
    setIsSavingGenerated(false);
  };

  const resetAnalysisDialog = () => {
    setAnalysisProjectName("");
    setAnalysisLanguage("typescript");
    setAnalysisDepth("modules");
    setAnalysisInput("");
    setAnalysisEntryPaths("src/, cloudflare-worker/");
    setIsStartingAnalysis(false);
    setAnalysisJobId(null);
    setAnalysisJob(null);
  };

  const parsePaths = (value: string) =>
    value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const includeGlobsByLanguage = (language: "typescript" | "javascript" | "auto") => {
    if (language === "typescript") return ["**/*.ts", "**/*.tsx"];
    if (language === "javascript") return ["**/*.js", "**/*.jsx"];
    return ["**/*.{ts,tsx,js,jsx,py,go}"];
  };

  const createDiagram = async () => {
    if (!newName.trim() || !newInput.trim()) {
      toast.error("Заповніть назву та вхідний текст");
      return;
    }

    setIsGenerating(true);

    try {
      const generated = (await api.generate(newInput, newInputType)) as unknown as GenerateResult;

      if (!generated?.diagram) {
        throw new Error("Порожній результат генерації");
      }

      setGenerateResult({
        success: generated.success ?? true,
        diagram: {
          ...generated.diagram,
          name: newName,
          items: generated.diagram.items ?? {},
        },
        fixes: generated.fixes ?? [],
        metrics: {
          sis: generated.metrics?.sis ?? "0%",
          sis_ok: Boolean(generated.metrics?.sis_ok),
          rdc: generated.metrics?.rdc ?? 0,
          rdc_ok: Boolean(generated.metrics?.rdc_ok),
          total_nodes: generated.metrics?.total_nodes ?? 0,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося згенерувати схему");
    } finally {
      setIsGenerating(false);
    }
  };

  const openManualEditor = () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const diagram: Diagram = {
      id,
      folderId: selectedFolderId,
      name: "Нова схема",
      createdAt: now,
      updatedAt: now,
      diagram: {
        name: "Нова схема",
        items: {
          "1": { type: "end", content: "" },
          "2": { type: "question", content: "Початок", one: "1" },
        },
      },
    };

    upsertDiagramInStorage(diagram);
    setDiagrams((prev) => [diagram, ...prev.filter((item) => item.id !== id)]);
    setDiagram(diagram);
    navigate({ to: "/editor/$id", params: { id } });
  };

  const saveGeneratedDiagram = async () => {
    if (!generateResult) return;

    setIsSavingGenerated(true);

    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const diagram: Diagram = {
        id,
        folderId: selectedFolderId,
        name: newName,
        createdAt: now,
        updatedAt: now,
        diagram: {
          ...generateResult.diagram,
          name: newName,
        },
      };

      await api.commit(selectedFolderId, id, diagram);
      upsertDiagramInStorage(diagram);
      localStorage.setItem(`diagram_metrics_${id}`, JSON.stringify(generateResult.metrics));
      setDiagram(diagram);
      setMetrics(generateResult.metrics);
      setDiagrams((prev) => [diagram, ...prev.filter((item) => item.id !== diagram.id)]);

      setIsCreateOpen(false);
      resetGenerationDialog();
      navigate({ to: "/editor/$id", params: { id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося зберегти схему");
    } finally {
      setIsSavingGenerated(false);
    }
  };

  const startAnalysis = async () => {
    if (!analysisProjectName.trim() || !analysisInput.trim()) {
      toast.error("Заповніть назву проєкту та код для аналізу");
      return;
    }

    setIsStartingAnalysis(true);

    try {
      const request: CodebaseAnalysisRequest = {
        projectName: analysisProjectName.trim(),
        sourceType: "text-paste",
        sourceContent: analysisInput,
        language: analysisLanguage,
        analysisDepth,
        entryPaths: parsePaths(analysisEntryPaths),
        includeGlobs: includeGlobsByLanguage(analysisLanguage),
        excludeGlobs: ["node_modules/**", "dist/**"],
      };

      const { jobId } = await api.analyzeCodebase(request);
      setAnalysisJobId(jobId);
      setAnalysisJob({
        jobId,
        status: "pending",
        projectName: request.projectName,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося запустити аналіз");
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  useEffect(() => {
    const analysisStatus = analysisJob?.status;

    if (!analysisJobId) return;
    if (!analysisStatus || !["pending", "analyzing"].includes(analysisStatus)) return;

    const timer = window.setTimeout(async () => {
      try {
        const job = await api.getAnalysisJob(analysisJobId);
        setAnalysisJob(job);
      } catch (error) {
        setAnalysisJob((prev) =>
          prev
            ? {
                ...prev,
                status: "failed",
                error: error instanceof Error ? error.message : "Помилка опитування статусу",
              }
            : prev,
        );
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [analysisJobId, analysisJob?.status]);

  const deleteDiagram = async (diagram: Diagram) => {
    removeDiagramFromStorage(diagram.id);
    setDiagrams((prev) => prev.filter((item) => item.id !== diagram.id));

    try {
      await api.deleteDiagram(diagram.folderId, diagram.id);
    } catch (error) {
      toast.error("Схему видалено локально, але сервер не відповів");
    }
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

      const diagram: Diagram = {
        id,
        folderId: selectedFolderId,
        name,
        createdAt: now,
        updatedAt: now,
        diagram: {
          ...parsed,
          name,
          items: parsed.items ?? {},
        },
      };

      await api.commit(selectedFolderId, id, diagram);
      upsertDiagramInStorage(diagram);
      setDiagrams((prev) => [diagram, ...prev.filter((item) => item.id !== id)]);
      toast.success("Diagram imported successfully");
    } catch {
      toast.error("Помилка імпорту JSON");
    } finally {
      event.target.value = "";
    }
  };

  const createFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      toast.error("Вкажіть назву папки");
      return;
    }

    const id = slugifyFolderId(trimmed);
    if (!id) {
      toast.error("Некоректна назва папки");
      return;
    }

    if (folders.some((folder) => folder.id === id)) {
      toast.error("Папка з такою назвою вже існує");
      return;
    }

    const nextFolders = [...folders, { id, name: trimmed }];
    setFolders(nextFolders);
    writeFoldersToStorage(nextFolders);
    setSelectedFolderId(id);
    setNewFolderName("");
    setIsCreateFolderOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <div className="border-b border-border bg-card p-3 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobileFoldersCollapsed((prev) => !prev)}
        >
          {isMobileFoldersCollapsed ? "Показати папки" : "Сховати папки"}
        </Button>
      </div>

      <aside
        className={`${isMobileFoldersCollapsed ? "hidden md:block" : "block"} w-full border-b border-border bg-card p-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <h2 className="text-base font-semibold">Папки</h2>
        <div className="mt-4 space-y-2">
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={folder.id === selectedFolderId ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedFolderId(folder.id)}
            >
              {folder.name}
            </Button>
          ))}
        </div>
        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="mt-4 w-full" type="button">
              + Нова папка
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Нова папка</DialogTitle>
              <DialogDescription>Створіть нову папку для діаграм.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-folder-name">Назва папки</Label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="Наприклад: Auth Flows"
              />
            </div>
            <DialogFooter>
              <Button type="button" onClick={createFolder}>
                Створити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </aside>

      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold">{selectedFolder.name}</h1>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
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
            <Dialog
              open={isAnalyzeOpen}
              onOpenChange={(open) => {
                setIsAnalyzeOpen(open);
                if (!open) {
                  resetAnalysisDialog();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  Analyze Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Analyze codebase</DialogTitle>
                  <DialogDescription>Запустіть analysis flow для проєкту.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="analysis-project-name">Project name</Label>
                    <Input
                      id="analysis-project-name"
                      value={analysisProjectName}
                      onChange={(event) => setAnalysisProjectName(event.target.value)}
                      placeholder="Наприклад: DRAKON Editor"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={analysisLanguage}
                        onValueChange={(value: "typescript" | "javascript" | "auto") =>
                          setAnalysisLanguage(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Оберіть мову" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="typescript">TypeScript</SelectItem>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Analysis depth</Label>
                      <Select
                        value={analysisDepth}
                        onValueChange={(value: "overview" | "modules" | "flows" | "procedures") =>
                          setAnalysisDepth(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Оберіть глибину" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overview">Overview</SelectItem>
                          <SelectItem value="modules">Modules</SelectItem>
                          <SelectItem value="flows">Flows</SelectItem>
                          <SelectItem value="procedures">Procedures</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analysis-input">Code input</Label>
                    <Textarea
                      id="analysis-input"
                      value={analysisInput}
                      onChange={(event) => setAnalysisInput(event.target.value)}
                      rows={6}
                      placeholder="Вставте код проєкту або ключові модулі"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analysis-entry-paths">Entry paths</Label>
                    <Textarea
                      id="analysis-entry-paths"
                      value={analysisEntryPaths}
                      onChange={(event) => setAnalysisEntryPaths(event.target.value)}
                      rows={3}
                      placeholder="src/, cloudflare-worker/"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" onClick={startAnalysis} disabled={isStartingAnalysis}>
                    {isStartingAnalysis ? "Starting..." : "Start Analysis"}
                  </Button>
                </DialogFooter>

                {analysisJob ? (
                  <div className="mt-4 space-y-4 rounded-md border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant="secondary">{analysisJob.status}</Badge>
                    </div>

                    {analysisJob.error ? (
                      <p className="text-sm text-destructive">{analysisJob.error}</p>
                    ) : null}

                    {analysisJob.plannedDiagrams?.length ? (
                      <div className="grid grid-cols-1 gap-3">
                        {analysisJob.plannedDiagrams.map((diagram) => (
                          <Card
                            key={`${diagram.name}-${diagram.scope}`}
                            className="border-border bg-card"
                          >
                            <CardHeader>
                              <CardTitle className="text-sm">{diagram.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground">{diagram.description}</p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{diagram.scope}</Badge>
                                <Badge variant="secondary">{diagram.estimatedComplexity}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>

            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  resetGenerationDialog();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button">+ Нова схема</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Нова схема</DialogTitle>
                  <DialogDescription>Створіть схему через AI-генерацію.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="diagram-name">Назва схеми</Label>
                    <Input
                      id="diagram-name"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="Наприклад: Авторизація користувача"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagram-input">Опис або код</Label>
                    <Textarea
                      id="diagram-input"
                      value={newInput}
                      onChange={(event) => setNewInput(event.target.value)}
                      rows={6}
                      placeholder="Вставте текст опису або фрагмент коду"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Тип вводу</Label>
                    <Select
                      value={newInputType}
                      onValueChange={(value: "text" | "code") => setNewInputType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Текст опису</SelectItem>
                        <SelectItem value="code">Код програми</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {generateResult ? (
                  <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold">Результат генерації</h3>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        Вузлів: {generateResult.metrics.total_nodes}
                      </Badge>
                      <Badge
                        className={[
                          "border-transparent",
                          generateResult.metrics.sis_ok
                            ? "border-transparent bg-chart-2/20 text-foreground"
                            : "border-transparent bg-chart-4/20 text-foreground",
                        ].join(" ")}
                      >
                        Шампур: {generateResult.metrics.sis}
                      </Badge>
                      <Badge
                        className={[
                          "border-transparent",
                          generateResult.metrics.rdc > 4
                            ? "border-transparent bg-destructive/20 text-foreground"
                            : generateResult.metrics.rdc_ok
                              ? "border-transparent bg-chart-2/20 text-foreground"
                              : "border-transparent bg-chart-4/20 text-foreground",
                        ].join(" ")}
                      >
                        Глибина: {generateResult.metrics.rdc}
                      </Badge>
                    </div>

                    {generateResult.fixes.length > 0 ? (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button type="button" variant="ghost" className="h-8 px-0 text-sm">
                            Автовиправлення ({generateResult.fixes.length})
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ul className="space-y-1">
                            {generateResult.fixes.map((fix, index) => (
                              <li
                                key={`${fix}-${index}`}
                                className="flex items-start gap-2 text-xs text-muted-foreground"
                              >
                                <Wrench
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{fix}</span>
                              </li>
                            ))}
                          </ul>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : null}

                    <DialogFooter>
                      <Button
                        type="button"
                        onClick={saveGeneratedDiagram}
                        disabled={isSavingGenerated}
                      >
                        {isSavingGenerated ? "Збереження..." : "Зберегти схему"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={createDiagram}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "Генерація..." : "Спробувати ще раз"}
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <DialogFooter>
                    <Button type="button" onClick={createDiagram} disabled={isGenerating}>
                      {isGenerating ? "Генерація..." : "Згенерувати схему"}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
            <Button type="button" variant="secondary" onClick={openManualEditor}>
              Ручний редактор
            </Button>
          </div>
        </div>

        {folderDiagrams.length === 0 && !isLoadingDiagrams ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Схем поки немає
            </span>
            <p className="text-sm text-[var(--text-muted)]" style={{ textWrap: "pretty" }}>
              Натисніть «+ Нова схема» щоб згенерувати першу
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folderDiagrams.map((diagram) => {
              const openDiagram = () =>
                navigate({ to: "/editor/$id", params: { id: diagram.id } });

              return (
                <div
                  key={diagram.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Відкрити схему ${diagram.name}`}
                  onClick={openDiagram}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDiagram();
                    }
                  }}
                  className="group relative cursor-pointer rounded-[var(--radius-md)] bg-[var(--bg-surface)] p-4 transition-colors duration-150 hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-amber)]/50"
                  style={{ boxShadow: "var(--shadow-card)", touchAction: "manipulation" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-mono text-sm font-medium leading-snug text-[var(--text-primary)]"
                      style={{ textWrap: "balance" }}
                    >
                      {diagram.name}
                    </h3>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Видалити ${diagram.name}`}
                          onClick={(event) => event.stopPropagation()}
                          className="flex-shrink-0 rounded-[var(--radius-md)] p-1.5 text-[var(--text-muted)] opacity-0 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 active:scale-[0.96] group-hover:opacity-100 md:opacity-0"
                          style={{ touchAction: "manipulation" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Видалити схему?</AlertDialogTitle>
                          <AlertDialogDescription>
                            «{diagram.name}» буде видалено. Цю дію неможливо скасувати.
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

                  <div
                    className="mt-2 flex items-center gap-3 font-mono text-xs text-[var(--text-muted)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    <span>{format(new Date(diagram.createdAt), "dd.MM.yyyy HH:mm")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

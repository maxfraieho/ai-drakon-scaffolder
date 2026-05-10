import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DrakonEditor } from "@/components/DrakonEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { getDiagramLevel } from "@/lib/htse/diagram-context";
import { readDiagramsFromStorage, upsertDiagramInStorage } from "@/lib/diagram-storage";
import { DEFAULT_FOLDER, readFoldersFromStorage, type Folder } from "@/lib/folder-storage";
import { useDiagramStore } from "@/store/useDiagramStore";
import { withDiagramMetadataDefaults, type DiagramMetadata, type DiagramSourceType } from "@/types/diagram-metadata";
import type { Diagram } from "@/types/drakon";

export function EditorPage({ diagramId }: { diagramId: string }) {
  const id = diagramId;
  const navigate = useNavigate();

  const { currentDiagram, metrics, isDirty, isSaving, setDiagram, setMetrics, saveDiagram } =
    useDiagramStore();

  const [nameDraft, setNameDraft] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [folders] = useState<Folder[]>(() => readFoldersFromStorage());
  const [analysisFolderSlug, setAnalysisFolderSlug] = useState<string>("general");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metadataDraft, setMetadataDraft] = useState<DiagramMetadata>(withDiagramMetadataDefaults());
  const [metadataDirty, setMetadataDirty] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(true);

  const selectedAnalysisFolder = useMemo(
    () => folders.find((folder) => folder.slug === analysisFolderSlug) ?? DEFAULT_FOLDER,
    [analysisFolderSlug, folders],
  );

  useEffect(() => {
    const localDiagram = readDiagramsFromStorage().find((item) => item.id === id);

    if (!localDiagram) {
      navigate({ to: "/diagrams", replace: true });
      return;
    }

    setDiagram(localDiagram);
    setNameDraft(localDiagram.name);
    setNameDirty(false);
    setAnalysisFolderSlug(localDiagram.folderId || "general");
    setMetadataDraft(withDiagramMetadataDefaults(localDiagram.diagram.metadata));
    setMetadataDirty(false);

    const localKey = `diagram_${id}`;
    localStorage.setItem(localKey, JSON.stringify(localDiagram));
  }, [id, navigate, setDiagram]);

  useEffect(() => {
    setMetrics(null);
    const saved = localStorage.getItem(`diagram_metrics_${id}`);
    if (saved) {
      try {
        setMetrics(JSON.parse(saved));
      } catch {}
    }
  }, [id, setMetrics]);

  const hasChanges = isDirty || nameDirty || metadataDirty;

  const currentStatus = useMemo(() => {
    if (hasChanges) {
      return { label: "Є зміни", variant: "secondary" as const };
    }

    return { label: "Збережено", variant: "default" as const };
  }, [hasChanges]);

  const syncNameToStore = () => {
    if (!currentDiagram) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === currentDiagram.name) return;

    const updated: Diagram = {
      ...currentDiagram,
      name: trimmed,
      updatedAt: new Date().toISOString(),
      diagram: {
        ...currentDiagram.diagram,
        name: trimmed,
      },
    };

    setDiagram(updated);
    setNameDirty(true);
  };

  const handleSave = async () => {
    if (!currentDiagram) return;

    try {
      const normalizedMetadata = withDiagramMetadataDefaults({
        ...metadataDraft,
        diagramLevel:
          metadataDraft.diagramLevel ?? getDiagramLevel(nameDraft.trim() || currentDiagram.name) ?? undefined,
      });

      const updatedWithMetadata: Diagram = {
        ...currentDiagram,
        updatedAt: new Date().toISOString(),
        diagram: {
          ...currentDiagram.diagram,
          metadata: normalizedMetadata,
        },
      };
      setDiagram(updatedWithMetadata);
      upsertDiagramInStorage(updatedWithMetadata);

      if (nameDraft.trim() && nameDraft.trim() !== currentDiagram.name) {
        const updated: Diagram = {
          ...updatedWithMetadata,
          name: nameDraft.trim(),
          updatedAt: new Date().toISOString(),
          diagram: {
            ...updatedWithMetadata.diagram,
            name: nameDraft.trim(),
            metadata: withDiagramMetadataDefaults({
              ...normalizedMetadata,
              diagramLevel: normalizedMetadata.diagramLevel ?? getDiagramLevel(nameDraft.trim()) ?? undefined,
            }),
          },
        };
        setDiagram(updated);
        upsertDiagramInStorage(updated);
      }

      await saveDiagram();
      const refreshed = useDiagramStore.getState().currentDiagram;
      if (refreshed) {
        upsertDiagramInStorage({ ...refreshed, updatedAt: new Date().toISOString() });
        setMetadataDraft(withDiagramMetadataDefaults(refreshed.diagram.metadata));
      }
      setNameDirty(false);
      setMetadataDirty(false);
      toast.success("Схему збережено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося зберегти схему");
    }
  };

  const handleAnalyze = async () => {
    if (!currentDiagram || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const request = {
        projectName: currentDiagram.name,
        sourceType: "text-paste" as const,
        sourceContent: JSON.stringify(currentDiagram.diagram, null, 2),
        language: "auto" as const,
        analysisDepth: "procedures" as const,
        entryPaths: [],
        includeGlobs: [],
        excludeGlobs: [],
      };

      const { jobId } = await api.analyzeCodebase(request);
      let job = await api.getAnalysisJob(jobId);
      let attempts = 0;

      while (job.status !== "completed" && job.status !== "failed" && attempts < 15) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        job = await api.getAnalysisJob(jobId);
        attempts += 1;
      }

      if (job.status !== "completed" || !job.plannedDiagrams?.length) {
        toast.error("Аналіз завершився без нових діаграм");
        return;
      }

      const now = new Date().toISOString();
      const generated = job.plannedDiagrams.map((item) => {
        const id = crypto.randomUUID();
        return {
          id,
          name: item.name,
          folderId: selectedAnalysisFolder.slug,
          createdAt: now,
          updatedAt: now,
          diagram: {
            name: item.name,
            items: {
              "1": { type: "header", content: item.name },
              "2": { type: "action", content: item.description || "Результат аналізу", one: "3" },
              "3": { type: "end", content: "Кінець" },
            },
          },
        } satisfies Diagram;
      });

      for (const diagram of generated) {
        upsertDiagramInStorage(diagram);
        try {
          await api.saveDiagram(diagram.folderId, diagram.id, diagram.diagram);
        } catch {
          // ignore remote save errors
        }
      }

      toast.success(
        `Створено ${generated.length} діаграм у папці "${selectedAnalysisFolder.name}"`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося виконати аналіз");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!currentDiagram) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Завантаження схеми...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/diagrams" })}>
            ← Назад
          </Button>
          <Input
            value={nameDraft}
            onChange={(event) => {
              setNameDraft(event.target.value);
              if (!nameDirty) setNameDirty(true);
            }}
            onBlur={syncNameToStore}
            className="h-9 w-72"
          />
          <Badge variant="outline">Папка: {currentDiagram.folderId}</Badge>
          <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Select value={analysisFolderSlug} onValueChange={setAnalysisFolderSlug}>
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="Папка для результатів" />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.slug}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="secondary" onClick={handleAnalyze} disabled={isAnalyzing}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isAnalyzing ? "Аналіз..." : "Аналізувати"}
          </Button>
          {metrics ? (
            <>
              <Badge variant="secondary">Вузлів: {metrics.total_nodes}</Badge>
              <Badge
                className={[
                  "border-transparent",
                  metrics.sis_ok
                    ? "border-transparent bg-chart-2/20 text-foreground"
                    : "border-transparent bg-chart-4/20 text-foreground",
                ].join(" ")}
              >
                Шампур: {metrics.sis}
              </Badge>
              <Badge
                className={[
                  "border-transparent",
                  metrics.rdc > 4
                    ? "border-transparent bg-destructive/20 text-foreground"
                    : metrics.rdc_ok
                      ? "border-transparent bg-chart-2/20 text-foreground"
                      : "border-transparent bg-chart-4/20 text-foreground",
                ].join(" ")}
              >
                Глибина: {metrics.rdc}
              </Badge>
            </>
          ) : null}

          <Button type="button" onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </header>

      <div className="border-b border-border px-4 py-3">
        <Collapsible open={isMetadataOpen} onOpenChange={setIsMetadataOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Metadata</span>
              <Badge variant="outline">source: {metadataDraft.sourceType ?? "human"}</Badge>
              <Badge variant="outline">
                level: {metadataDraft.diagramLevel ?? getDiagramLevel(nameDraft) ?? "unknown"}
              </Badge>
            </div>
            <ChevronDown className={["h-4 w-4 transition-transform", isMetadataOpen ? "rotate-180" : ""].join(" ")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Diagram Level</Label>
                <Select
                  value={metadataDraft.diagramLevel ?? "unknown"}
                  onValueChange={(value) => {
                    setMetadataDraft((prev) => ({
                      ...prev,
                      diagramLevel: value === "unknown" ? undefined : (value as DiagramMetadata["diagramLevel"]),
                    }));
                    setMetadataDirty(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="unknown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">unknown</SelectItem>
                    <SelectItem value="L0">L0</SelectItem>
                    <SelectItem value="L1">L1</SelectItem>
                    <SelectItem value="L2">L2</SelectItem>
                    <SelectItem value="L3">L3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select
                  value={metadataDraft.sourceType ?? "human"}
                  onValueChange={(value) => {
                    setMetadataDraft((prev) => ({ ...prev, sourceType: value as DiagramSourceType }));
                    setMetadataDirty(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">human</SelectItem>
                    <SelectItem value="ai">ai</SelectItem>
                    <SelectItem value="hybrid">hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>File Paths (comma separated)</Label>
                <Input
                  value={(metadataDraft.filePaths ?? []).join(", ")}
                  onChange={(event) => {
                    const filePaths = event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean);
                    setMetadataDraft((prev) => ({ ...prev, filePaths }));
                    setMetadataDirty(true);
                  }}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Symbol Refs (comma separated)</Label>
                <Input
                  value={(metadataDraft.symbolRefs ?? []).join(", ")}
                  onChange={(event) => {
                    const symbolRefs = event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean);
                    setMetadataDraft((prev) => ({ ...prev, symbolRefs }));
                    setMetadataDirty(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Parent Diagram ID</Label>
                <Input
                  value={metadataDraft.parentDiagramId ?? ""}
                  onChange={(event) => {
                    setMetadataDraft((prev) => ({
                      ...prev,
                      parentDiagramId: event.target.value.trim() || undefined,
                    }));
                    setMetadataDirty(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Analysis Job ID</Label>
                <Input value={metadataDraft.analysisJobId ?? ""} readOnly />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="reviewedByHuman"
                  checked={Boolean(metadataDraft.reviewedByHuman)}
                  onCheckedChange={(checked) => {
                    setMetadataDraft((prev) => ({ ...prev, reviewedByHuman: Boolean(checked) }));
                    setMetadataDirty(true);
                  }}
                />
                <Label htmlFor="reviewedByHuman">Reviewed by Human</Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <main className="flex flex-1 p-4">
        <DrakonEditor
          diagramId={id}
          folderSlug={currentDiagram.folderId}
          diagram={currentDiagram.diagram as never}
          className="w-full"
          onSaved={() => {
            const refreshed = useDiagramStore.getState().currentDiagram;
            if (refreshed) {
              setDiagram(refreshed);
              setNameDraft(refreshed.name);
              setNameDirty(false);
            }
          }}
        />
      </main>
    </div>
  );
}

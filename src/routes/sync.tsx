import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FilePlus, GitCompare, Loader2, RefreshCw, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import {
  compareAnalysisToDiagram,
  type CodeDiagramDiff,
  type MissingInDiagram,
  type MatchedItem,
  type MissingInCode,
} from "@/lib/htse/code-diagram-diff";
import { readDiagramsFromStorage } from "@/lib/diagram-storage";
import {
  ProjectFolderSection,
  readProjectFolderDefaults,
  type ProjectFolderValue,
} from "@/components/drakon/ProjectFolderSection";
import {
  parseOwnerRepo,
  sanitizeDiagramId,
  saveDiagramToGit,
  saveDiagramToMinio,
} from "@/lib/mcp/projects";
import { hasClientJwt } from "@/lib/route-auth";
import type { AnalysisJob } from "@/types/analysis";

export const Route = createFileRoute("/sync")({
  component: SyncRoute,
});

function SyncRoute() {
  if (!hasClientJwt()) {
    return <Navigate to="/login" replace />;
  }
  return <SyncPage />;
}

function SyncPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [diff, setDiff] = useState<CodeDiagramDiff | null>(null);
  const [lastJob, setLastJob] = useState<AnalysisJob | null>(null);
  const [matchedOpen, setMatchedOpen] = useState(false);

  const runSync = async () => {
    setIsLoading(true);
    try {
      const jobs = await api.listAnalysisJobs();
      const completed = jobs.find((j) => j.status === "completed" && j.summary);
      if (!completed?.summary) {
        toast.error("No completed analysis job found. Run analysis first.");
        return;
      }
      setLastJob(completed);
      const diagrams = readDiagramsFromStorage();
      const result = compareAnalysisToDiagram(completed.summary, diagrams);
      setDiff(result);
    } catch (e) {
      toast.error(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <GitCompare className="h-6 w-6" />
              Code ↔ Diagram Sync
            </h1>
            {lastJob && (
              <p className="mt-1 text-sm text-muted-foreground">
                Analysis: <span className="font-mono">{lastJob.projectName}</span> · {lastJob.createdAt.split("T")[0]}
              </p>
            )}
          </div>
          <Button onClick={() => void runSync()} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run Sync Check
          </Button>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300">
          <strong>Code ⇄ Diagram Sync</strong> порівнює результати аналізу коду з DRAKON-діаграмами у сховищі.
          Спочатку запусти аналіз коду у вкладці <strong>Аналіз</strong>, потім натисни кнопку нижче.
        </div>

        {/* Stats row */}
        {diff && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Coverage" value={`${diff.stats.coveragePercent}%`} accent={diff.stats.coveragePercent > 50 ? "green" : "amber"} />
            <StatCard label="Matched" value={String(diff.stats.matchedCount)} />
            <StatCard label="Missing diagrams" value={String(diff.missingInDiagram.length)} accent={diff.missingInDiagram.length > 0 ? "red" : undefined} />
            <StatCard label="Orphaned" value={String(diff.missingInCode.length)} accent={diff.missingInCode.length > 0 ? "amber" : undefined} />
          </div>
        )}

        {!diff && !isLoading && (
          <p className="text-center text-muted-foreground">Press "Run Sync Check" to compare code analysis with your diagrams.</p>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {diff && (
          <div className="space-y-4">
            {/* Missing in Diagram */}
            {diff.missingInDiagram.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    Missing Diagrams
                    <Badge variant="destructive">{diff.missingInDiagram.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {diff.missingInDiagram.map((item) => (
                    <MissingRow key={item.symbolName} item={item} onCreateDiagram={() => {
                      void navigate({
                        to: "/diagram/editor",
                        search: {
                          isNew: "true",
                          folderId: "general",
                          diagramId: item.suggestedDiagramName,
                        },
                      });
                    }} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Orphaned Diagrams */}
            {diff.missingInCode.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    Potentially Orphaned Diagrams
                    <Badge variant="secondary">{diff.missingInCode.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {diff.missingInCode.map((item) => (
                    <OrphanRow key={item.diagramId} item={item} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Matched — collapsible */}
            {diff.matched.length > 0 && (
              <Collapsible open={matchedOpen} onOpenChange={setMatchedOpen}>
                <Card>
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between text-left">
                        <CardTitle className="flex items-center gap-2 text-base">
                          Matched Symbols
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {diff.matched.length}
                          </Badge>
                        </CardTitle>
                        {matchedOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {diff.matched.map((item) => (
                          <MatchedRow key={`${item.symbolName}-${item.diagramId}`} item={item} />
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
        )}

        {diff && diff.missingInDiagram.length > 0 && (
          <BindAnalysisToFolderCard items={diff.missingInDiagram} />
        )}
      </div>
    </div>
  );
}

function defaultMinioFolder(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("github.lastRepo");
    if (raw) {
      const parsed = JSON.parse(raw) as { owner?: string; repo?: string };
      if (parsed.owner && parsed.repo) return `${parsed.owner}--${parsed.repo}`;
    }
  } catch { /* ignore */ }
  return "";
}

function BindAnalysisToFolderCard({ items }: { items: MissingInDiagram[] }) {
  const navigate = useNavigate();
  const [folder, setFolder] = useState<string>(() => defaultMinioFolder());
  const [pf, setPf] = useState<ProjectFolderValue>(() => {
    const d = readProjectFolderDefaults();
    return { ...d, folderSlug: d.folderSlug || defaultMinioFolder() };
  });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState<{ minio: number; git: number; failed: number } | null>(null);
  const [failures, setFailures] = useState<Array<{ id: string; error: string }>>([]);
  const [showFailures, setShowFailures] = useState(false);

  const targetFolder = useMemo(
    () => (folder.trim() || pf.folderSlug || "general"),
    [folder, pf.folderSlug],
  );

  const runSaveAll = async () => {
    if (items.length === 0) return;
    setIsSaving(true);
    setSummary(null);
    setFailures([]);
    setShowFailures(false);
    setProgress({ done: 0, total: items.length });

    let okMinio = 0;
    let okGit = 0;
    let failed = 0;
    const fails: Array<{ id: string; error: string }> = [];

    const ownerRepo = pf.saveToGit && pf.repo.trim() && pf.githubToken.trim()
      ? parseOwnerRepo(pf.repo)
      : null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = sanitizeDiagramId(item.suggestedDiagramName || item.symbolName);
      const diagram = {
        name: item.suggestedDiagramName || item.symbolName,
        access: "write" as const,
        items: {
          "1": { type: "end" },
          "2": { type: "branch", branchId: 0, one: "3" },
          "3": { type: "action", content: item.symbolName, one: "1" },
        },
      };
      try {
        await saveDiagramToMinio(targetFolder, id, diagram);
        okMinio++;
        if (ownerRepo) {
          try {
            await saveDiagramToGit({
              owner: ownerRepo.owner,
              repo: ownerRepo.repo,
              branch: pf.branch.trim() || "main",
              diagramId: id,
              diagram,
              token: pf.githubToken,
            });
            okGit++;
          } catch (err) {
            console.warn("git save failed", id, err);
            failed++;
            fails.push({ id, error: `git: ${err instanceof Error ? err.message : String(err)}` });
          }
        }
      } catch (err) {
        console.warn("minio save failed", id, err);
        failed++;
        fails.push({ id, error: `minio: ${err instanceof Error ? err.message : String(err)}` });
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setSummary({ minio: okMinio, git: okGit, failed });
    setFailures(fails);
    setIsSaving(false);
    if (failed === 0) {
      toast.success(`✓ ${okMinio} diagrams → MinIO \`${targetFolder}\``);
      if (ownerRepo) toast.success("✓ git drn/ updated");
    } else {
      toast.error(`Completed with ${failed} failure(s)`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bind analysis to project folder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="bind-folder" className="text-xs">MinIO folder</Label>
          <Input
            id="bind-folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="owner--repo"
            className="h-8 text-sm font-mono"
          />
        </div>

        <ProjectFolderSection
          value={pf}
          onChange={setPf}
          hideFolder
          compact
        />

        {progress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>Saving {progress.done}/{progress.total} diagrams…</span>
              <span>{Math.round((progress.done / progress.total) * 100)}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {summary && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            ✓ {summary.minio} diagrams → MinIO <code className="font-mono">{targetFolder}</code>
            {summary.git > 0 && <> · ✓ git drn/ updated ({summary.git})</>}
            {summary.failed > 0 && <> · ✗ {summary.failed} failed</>}
          </div>
        )}

        {failures.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setShowFailures((v) => !v)}
              className="text-xs text-red-500 hover:underline"
            >
              {showFailures ? "Hide" : "Show"} failures ({failures.length})
            </button>
            {showFailures && (
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-red-500/40 bg-black/40 p-2 font-mono text-[11px] text-red-300 space-y-1">
                {failures.map((f, i) => (
                  <div key={i} className="break-all">
                    <span className="text-red-200">{f.id}</span>: {f.error.slice(0, 100)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void runSaveAll()} disabled={isSaving || items.length === 0}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save all to MinIO + git
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              navigate({
                to: "/diagrams",
                search: { autoAnalyze: undefined, analyzePath: undefined },
              })
            }
            disabled={!summary}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Open in Editor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const colors =
    accent === "green" ? "text-green-600 dark:text-green-400"
    : accent === "amber" ? "text-amber-500"
    : accent === "red" ? "text-destructive"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-4 pb-3 text-center">
        <div className={`text-2xl font-bold ${colors}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function MissingRow({ item, onCreateDiagram }: { item: MissingInDiagram; onCreateDiagram: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div className="min-w-0">
        <span className="font-medium">{item.symbolName}</span>
        <span className="ml-2 font-mono text-xs text-muted-foreground">{item.symbolType}</span>
        <div className="truncate text-xs text-muted-foreground">{item.filePath}</div>
        <div className="text-xs text-blue-500">→ {item.suggestedDiagramName}</div>
      </div>
      <Button size="sm" variant="outline" className="ml-3 shrink-0 h-7 px-2 text-xs" onClick={onCreateDiagram}>
        <FilePlus className="mr-1 h-3 w-3" />
        Create
      </Button>
    </div>
  );
}

function OrphanRow({ item }: { item: MissingInCode }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <div>
        <span className="font-medium">{item.diagramName}</span>
        <Badge variant="outline" className="ml-2 text-xs">{item.possibleReason}</Badge>
        <div className="text-xs text-muted-foreground">{item.lastModified.split("T")[0]}</div>
      </div>
    </div>
  );
}

function MatchedRow({ item }: { item: MatchedItem }) {
  return (
    <div className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
      <Badge variant={item.matchType === "exact" ? "secondary" : "outline"} className="px-1 text-[10px]">
        {item.matchType}
      </Badge>
      <span className="font-medium">{item.symbolName}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-muted-foreground">{item.diagramName}</span>
    </div>
  );
}

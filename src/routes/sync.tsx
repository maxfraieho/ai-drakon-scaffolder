import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FilePlus, GitCompare, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import {
  compareAnalysisToDiagram,
  type CodeDiagramDiff,
  type MissingInDiagram,
  type MatchedItem,
  type MissingInCode,
} from "@/lib/htse/code-diagram-diff";
import { readDiagramsFromStorage } from "@/lib/diagram-storage";
import type { AnalysisJob } from "@/types/analysis";

export const Route = createFileRoute("/sync")({
  component: SyncRoute,
});

function SyncRoute() {
  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return null;
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

  useEffect(() => {
    void runSync();
  }, []);

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
      </div>
    </div>
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

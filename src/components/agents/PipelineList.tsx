import { useEffect, useState } from "react";
import { listPipelines, type PipelineInfo } from "@/lib/graph-pipeline-api";
import { FileText, Loader2, GitFork } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineListProps {
  selectedPipelineName: string | null;
  onSelectPipeline: (name: string) => void;
}

const FALLBACK_PIPELINES: PipelineInfo[] = [
  { name: "sharon_consultant_api", display_name: "Sharon Consultant API" },
  { name: "sharon_consultant_graph", display_name: "Sharon Consultant Graph" },
  { name: "sharon_shelter_search", display_name: "Sharon Shelter Search" },
  { name: "pipeline_a", display_name: "Pipeline A (Complex)" },
  { name: "pipeline_b", display_name: "Pipeline B (Vibe Coding)" },
];

export function PipelineList({
  selectedPipelineName,
  onSelectPipeline,
}: PipelineListProps) {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchList() {
      try {
        const list = await listPipelines();
        if (active) {
          setPipelines(list.length > 0 ? list : FALLBACK_PIPELINES);
          setIsLoading(false);
          // If none selected, auto-select first
          if (!selectedPipelineName && list.length > 0) {
            onSelectPipeline(list[0].name);
          } else if (!selectedPipelineName && FALLBACK_PIPELINES.length > 0) {
            onSelectPipeline(FALLBACK_PIPELINES[0].name);
          }
        }
      } catch (e) {
        console.error("Failed to load pipelines, using fallback list:", e);
        if (active) {
          setPipelines(FALLBACK_PIPELINES);
          setIsLoading(false);
          if (!selectedPipelineName) {
            onSelectPipeline(FALLBACK_PIPELINES[0].name);
          }
        }
      }
    }

    fetchList();
    return () => {
      active = false;
    };
  }, [onSelectPipeline, selectedPipelineName]);

  return (
    <div
      className="flex flex-col h-full border-r w-[200px] shrink-0 overflow-y-auto"
      style={{
        backgroundColor: "var(--bg-base)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Пайплайни (IR)</span>
        <GitFork className="h-3 w-3" />
      </div>

      <div className="flex-1 p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          pipelines.map((p) => {
            const isSelected = p.name === selectedPipelineName;
            return (
              <button
                key={p.name}
                onClick={() => onSelectPipeline(p.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/50",
                  isSelected
                    ? "bg-accent/80 font-medium text-accent-foreground"
                    : "text-muted-foreground"
                )}
                style={
                  isSelected
                    ? {
                        borderLeft: "2px solid var(--accent-amber)",
                        paddingLeft: "6px",
                      }
                    : {}
                }
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{p.display_name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

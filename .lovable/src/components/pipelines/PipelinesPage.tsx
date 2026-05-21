import { useEffect, useState } from "react";
import {
  listPipelines,
  getPipeline,
  savePipeline,
  type PipelineInfo,
  type DrakonIR,
} from "@/lib/graph-pipeline-api";
import { PipelineDrakonView } from "./PipelineDrakonView";
import { Workflow, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ir, setIr] = useState<DrakonIR | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listPipelines()
      .then(setPipelines)
      .catch(() => toast.error("Не вдалось завантажити пайплайни"));
  }, []);

  const handleSelect = async (name: string) => {
    setSelected(name);
    setLoading(true);
    try {
      const data = await getPipeline(name);
      setIr(data);
    } catch {
      toast.error("Помилка завантаження пайплайну");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedIr: DrakonIR) => {
    if (!selected) return;
    await savePipeline(selected, updatedIr);
    setIr(updatedIr);
    toast.success("Пайплайн збережено і перезавантажено");
  };

  return (
    <div className="flex h-full bg-[var(--bg-base)]">
      {/* Left panel */}
      <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] flex flex-col">
        <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent-amber)]">
            Пайплайни
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pipelines.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              className={`w-full text-left px-3 py-2 rounded font-mono text-[11px] transition-colors ${
                selected === p.name
                  ? "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border border-[var(--accent-amber)]/30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Workflow className="inline h-3 w-3 mr-2 opacity-60" />
              {p.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {loading && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] font-mono text-xs">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Завантаження…
          </div>
        )}
        {!loading && ir && selected && (
          <PipelineDrakonView
            pipelineName={selected}
            ir={ir}
            onSave={handleSave}
          />
        )}
        {!loading && !ir && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] font-mono text-sm">
            Обери пайплайн зліва
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  listPipelines,
  getPipeline,
  savePipeline,
  type PipelineInfo,
  type IrDiagram,
} from "@/lib/graph-pipeline-api";
import { PipelineDrakonView } from "./PipelineDrakonView";
import { PipelineChat } from "./PipelineChat";
import { Bot, PanelRightClose, PanelRightOpen, RefreshCw, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ir, setIr] = useState<IrDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const refreshPipelines = () => {
    setListLoading(true);
    listPipelines()
      .then(setPipelines)
      .catch(() => toast.error("Не вдалось завантажити пайплайни"));
      
    void listPipelines()
      .then(setPipelines)
      .catch(() => toast.error("Не вдалось завантажити пайплайни"))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    refreshPipelines();
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

  const handleSave = async (updatedIr: IrDiagram) => {
    if (!selected) return;
    await savePipeline(selected, updatedIr);
    setIr(updatedIr);
    toast.success("Пайплайн збережено і перезавантажено");
  };

  return (
    <div className="flex h-full bg-[var(--bg-base)]">
      {/* Left panel */}
      <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] flex flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent-amber)]">
            Пайплайни
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={refreshPipelines}
            title="Оновити список"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${listLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!listLoading && pipelines.length === 0 && (
            <div className="rounded border border-[var(--border-subtle)] px-2.5 py-2 text-[11px] font-mono text-[var(--text-muted)]">
              Немає збережених пайплайнів.
            </div>
          )}
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
      <div className="flex flex-1 min-w-0">
        {loading && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] font-mono text-xs">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Завантаження…
          </div>
        )}
        {!loading && ir && selected && (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-8 shrink-0 items-center justify-end gap-2 border-b border-[var(--border-subtle)] px-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-[11px]"
                  onClick={() => setChatOpen((v) => !v)}
                >
                  <Bot className="h-3.5 w-3.5" />
                  Claude
                  {chatOpen ? (
                    <PanelRightClose className="h-3.5 w-3.5" />
                  ) : (
                    <PanelRightOpen className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <PipelineDrakonView
                  pipelineName={selected}
                  ir={ir}
                  onSave={handleSave}
                />
              </div>
            </div>

            {chatOpen && (
              <aside className="w-80 shrink-0 border-l border-[var(--border-subtle)]">
                <PipelineChat pipelineName={selected} ir={ir} />
              </aside>
            )}
          </>
        )}
        {!loading && !ir && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-[var(--text-muted)] font-mono text-sm">
            <div>Обери пайплайн зліва</div>
            <div className="text-[11px]">Після вибору тут відкриється IR-редактор та чат Claude.</div>
          </div>
        )}
      </div>
    </div>
  );
}

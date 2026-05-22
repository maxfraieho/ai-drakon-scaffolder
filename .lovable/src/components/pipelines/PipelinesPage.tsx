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
import { ArrowLeft, Bot, PanelRightClose, PanelRightOpen, RefreshCw, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileView = "list" | "ir" | "chat";

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ir, setIr] = useState<IrDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const refreshPipelines = () => {
    setListLoading(true);
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
    setMobileView("ir");
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
    toast.success("Пайплайн збережено");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)] md:flex-row">
      <div
        className={cn(
          "flex flex-col border-[var(--border-subtle)] bg-[var(--bg-base)]",
          mobileView === "list" ? "flex h-full w-full" : "hidden",
          "md:flex md:h-full md:w-56 md:shrink-0 md:border-r",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent-amber)]">Пайплайни</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshPipelines} title="Оновити">
            <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {!listLoading && pipelines.length === 0 && (
            <div className="rounded border border-[var(--border-subtle)] px-2.5 py-2 text-[11px] font-mono text-[var(--text-muted)]">
              Немає збережених пайплайнів.
            </div>
          )}
          {pipelines.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              className={cn(
                "w-full rounded px-3 py-2.5 text-left font-mono text-[11px] transition-colors",
                selected === p.name
                  ? "border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
              )}
            >
              <Workflow className="mr-2 inline h-3 w-3 opacity-60" />
              {p.display_name}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden",
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {loading && (
          <div className="flex h-full items-center justify-center font-mono text-xs text-[var(--text-muted)]">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Завантаження…
          </div>
        )}

        {!loading && !ir && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center font-mono text-sm text-[var(--text-muted)]">
            <Button variant="ghost" size="sm" className="mb-2 md:hidden" onClick={() => setMobileView("list")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              До списку
            </Button>
            <div>Обери пайплайн</div>
          </div>
        )}

        {!loading && ir && selected && (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col overflow-hidden",
                mobileView === "chat" ? "hidden md:flex" : "flex",
              )}
            >
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] md:hidden"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Список
                </Button>

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-[10px]"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setMobileView("chat");
                    } else {
                      setChatOpen((v) => !v);
                    }
                  }}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="sm:hidden">CLI</span><span className="hidden sm:inline">Agent CLI</span>
                  {chatOpen ? (
                    <PanelRightClose className="hidden h-3.5 w-3.5 md:inline" />
                  ) : (
                    <PanelRightOpen className="hidden h-3.5 w-3.5 md:inline" />
                  )}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <PipelineDrakonView pipelineName={selected} ir={ir} onSave={handleSave} />
              </div>
            </div>

            {(chatOpen || mobileView === "chat") && (
              <aside
                className={cn(
                  "flex flex-col overflow-hidden border-[var(--border-subtle)]",
                  mobileView === "chat" ? "h-full w-full" : "hidden",
                  "md:flex md:h-full md:w-80 md:shrink-0 md:border-l",
                )}
              >
                <PipelineChat
                  pipelineName={selected}
                  ir={ir}
                  className="h-full"
                  onBack={() => {
                    if (window.innerWidth < 768) {
                      setMobileView("ir");
                    } else {
                      setChatOpen(false);
                    }
                  }}
                />
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

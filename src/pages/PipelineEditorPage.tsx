import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ShieldCheck, Plus, Sliders, Workflow, Loader2, Play } from "lucide-react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { DrakonEditor } from "@/components/drakon/DrakonEditor";
import type { DrakonDiagram } from "@/types/drakonwidget";
import {
  fetchPipeline, savePipeline, validatePipeline,
  type PipelineConfig,
} from "@/lib/pipeline-config-api";
import { pipelineToIR, irToPipeline } from "@/lib/pipeline-to-drakon";
import { CompilerToolbar } from "@/components/pipeline/CompilerToolbar";
import { diagramToPseudocode, pseudocodeToMarkdown } from "@/lib/drakon/pseudocode";
import { readSettings } from "@/lib/settings-storage";
import { listPipelines, createPipeline } from "@/lib/graph-pipeline-api";
import type { PipelineInfo } from "@/lib/graph-pipeline-api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PipelineEditorPage() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const editMatch = routerState.matches.find((m) => m.routeId === "/pipeline/$pipelineId/edit");
  const pipelineId = editMatch ? (editMatch.params as any).pipelineId : undefined;

  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [compiling, setCompiling] = useState(false);

  // States for list view
  const [pipelinesList, setPipelinesList] = useState<PipelineInfo[]>([]);
  const [loadingList, setLoadingList] = useState(!pipelineId);
  const [listError, setListError] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!pipelineId) {
      setLoadingList(true);
      setListError(null);
      listPipelines()
        .then(setPipelinesList)
        .catch(() => {
          const message = "Помилка завантаження списку пайплайнів";
          setListError(message);
          toast.error(message);
        })
        .finally(() => setLoadingList(false));
    }
  }, [pipelineId]);

  useEffect(() => {
    if (pipelineId) {
      fetchPipeline(pipelineId)
        .then(setConfig)
        .catch(() => toast.error("Pipeline не знайдено"));
    }
  }, [pipelineId]);

const handleSaveOverride = async (diagram: DrakonDiagram): Promise<boolean> => {
if (!config) return false;
setErrors([]);
try {
const updated = irToPipeline(diagram, config);
const result = await savePipeline(updated);
setConfig((c) => (c ? { ...c, version: result.version } : c));
toast.success("Пайплайн збережено ✓");
return true;
} catch (e) {
const msg = e instanceof Error ? e.message : "Помилка збереження";
setErrors([msg]);
toast.error(msg);
return false;
}
};

const handleValidate = async () => {
try {
const res = await validatePipeline(pipelineId);
setErrors(res.errors);
if (res.valid) toast.success("Топологія валідна ✓");
else toast.error("Топологія невалідна");
} catch (e) {
toast.error("Помилка валідації");
}
};

const handleExportMrna = async () => {
    if (!config) return;
    try {
      const ir = pipelineToIR(config);
      const pseudo = await diagramToPseudocode(ir, config.name);
      const md = pseudocodeToMarkdown(pseudo, config.name);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.name}.pseudo.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Псевдокод експортовано");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка експорту";
      toast.error(msg);
    }
  };

  const handleCompile = async () => {
    if (!config) return;
    setCompiling(true);
    try {
      const ir = pipelineToIR(config);
      const pseudo = await diagramToPseudocode(ir, config.name);
      const nodes = config.nodes.map(n => ({
        label: n.label,
        type: n.type,
        is_llm: n.is_llm,
        is_deterministic: n.is_deterministic,
        description: n.description
      }));
      
      const settings = readSettings();
      const architectUrl = settings?.agents?.architectUrl || "https://architect-agent.exodus.pp.ua";
      const compileUrl = `${architectUrl.replace(/\/$/, "")}/compile`;

      const response = await fetch(compileUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipelineName: config.name,
          pseudocode: pseudo,
          nodes,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`сервер повернув статус ${response.status}`);
      }

      const data = await response.json();
      if (!data || typeof data.code !== "string") {
        throw new Error("Некоректна відповідь від сервера компіляції");
      }

      const blob = new Blob([data.code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.name}.workflow.ts`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Скомпільовано: " + config.name + ".workflow.ts");
    } catch (e) {
      let msg = "Компіляція не вдалась: ";
      if (e instanceof Error) {
        if (e.name === "AbortError") {
          msg += "перевищено ліміт часу (timeout 120с)";
        } else {
          msg += e.message;
        }
      } else {
        msg += String(e);
      }
      toast.error(msg);
    } finally {
      setCompiling(false);
    }
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    setCreating(true);
    try {
      const created = await createPipeline(newPipelineName.trim());
      toast.success("Пайплайн створено ✓");
      navigate({ to: "/pipeline/$pipelineId/edit", params: { pipelineId: created.name } });
    } catch {
      toast.error("Помилка створення пайплайну");
    } finally {
      setCreating(false);
    }
  };

  if (!pipelineId) {
    return (
      <div className="astryx-migrated min-h-screen bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] p-8 font-sans" data-testid="pipeline-editor-page">
        <header className="mb-8 flex items-center justify-between border-b border-[var(--astryx-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-8 h-8 text-[var(--astryx-color-brand)]" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Редактор граф-пайплайнів</h1>
              <p className="text-sm text-[var(--astryx-text-secondary)]">Створення, компіляція та редагування пайплайнів ШІ-агентів</p>
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--astryx-text-secondary)]">Доступні пайплайни</h2>
            {loadingList ? (
              <div className="flex items-center justify-center p-12 border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-lg)] bg-[var(--astryx-surface-primary)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--astryx-color-brand)]" />
              </div>
            ) : listError ? (
              <div className="flex items-center justify-center p-12 border border-red-500/30 rounded-[var(--astryx-radius-lg)] bg-red-500/10 text-center">
                <p className="text-sm text-red-300">{listError}</p>
              </div>
            ) : pipelinesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-[var(--astryx-border-subtle)] border-dashed rounded-[var(--astryx-radius-lg)] bg-[var(--astryx-surface-secondary)] text-center gap-2">
                <Workflow className="h-10 w-10 text-[var(--astryx-text-muted)]" />
                <p className="text-sm text-[var(--astryx-text-secondary)]">Пайплайнів ще не створено</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {pipelinesList.map((pipeline) => (
                  <div
                    key={pipeline.name}
                    className="flex items-center justify-between p-4 bg-[var(--astryx-surface-primary)] border border-[var(--astryx-border-subtle)] hover:border-[var(--astryx-color-brand)] rounded-[var(--astryx-radius-md)] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--astryx-color-brand-light)] rounded-[var(--astryx-radius-sm)] text-[var(--astryx-color-brand)] transition-colors">
                        <Workflow className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--astryx-text-primary)]">{pipeline.display_name}</h3>
                        <p className="text-[10px] text-[var(--astryx-text-muted)] font-mono">ID: {pipeline.name}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate({ to: "/pipeline/$pipelineId/edit", params: { pipelineId: pipeline.name } })}
                      className="bg-[var(--astryx-surface-elevated)] hover:bg-[var(--astryx-surface-secondary)] text-[var(--astryx-text-primary)] text-xs border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-sm)]"
                    >
                      Редагувати
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--astryx-text-secondary)]">Створити новий пайплайн</h2>
            <form onSubmit={handleCreatePipeline} className="bg-[var(--astryx-surface-primary)] border border-[var(--astryx-border-subtle)] rounded-[var(--astryx-radius-lg)] p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pipeline-name" className="text-xs text-[var(--astryx-text-secondary)]">Назва пайплайну</Label>
                <Input
                  id="pipeline-name"
                  type="text"
                  placeholder="my-agent-pipeline"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  className="bg-[var(--astryx-surface-secondary)] border-[var(--astryx-border-subtle)] h-9 text-sm focus-visible:ring-[var(--astryx-border-focus)]/30 text-[var(--astryx-text-primary)]"
                />
              </div>
              <Button
                type="submit"
                disabled={creating || !newPipelineName.trim()}
                className="w-full bg-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-hover)] text-[var(--astryx-color-on-brand)] font-semibold h-9 rounded-[var(--astryx-radius-sm)] gap-1.5"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Створити пайплайн
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--astryx-surface-page)] font-mono text-sm text-[var(--astryx-text-secondary)]">
        Завантаження пайплайну…
      </div>
    );
  }
  return (
<div className="astryx-migrated flex h-screen flex-col bg-[var(--astryx-surface-page)] text-[var(--astryx-text-primary)] antialiased" data-testid="pipeline-editor-page">
<CompilerToolbar
  onAnalyze={handleValidate}
  onExportMrna={handleExportMrna}
  onCompile={handleCompile}
  compiling={compiling}
/>
<div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
<Link
to="/agents"
className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
>
<ArrowLeft className="h-3.5 w-3.5" />
Агенти
</Link>
<span className="mx-1 text-[var(--border-subtle)]">·</span>
<span className="font-mono text-xs text-[var(--text-secondary)]">{config.name}</span>
<span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--text-tertiary)]">
v{config.version}
</span>
<Link
to="/pitch/$diagramId"
params={{ diagramId: config.name }}
className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--astryx-color-brand)] hover:bg-[var(--astryx-color-brand-light)] transition-colors duration-150"
>
<Play className="h-3.5 w-3.5" />
Pitch Mode
</Link>
<button
type="button"
onClick={handleValidate}
className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] active:scale-[0.96] active:transition-transform active:duration-75"
>
<ShieldCheck className="h-3.5 w-3.5" />
Validate
</button>
</div>

{errors.length > 0 && (
<div className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--border-subtle)] bg-red-950/30 px-3 py-1.5">
{errors.map((e, i) => (
<span key={i} className="font-mono text-[11px] text-red-400">{e}</span>
))}
</div>
)}

<div className="min-h-0 flex-1">
<DrakonEditor
diagram={pipelineToIR(config)}
diagramId={`pipeline-${config.id}`}
isNew={false}
onSaveOverride={handleSaveOverride}
className="h-full"
/>
</div>
</div>
);
}


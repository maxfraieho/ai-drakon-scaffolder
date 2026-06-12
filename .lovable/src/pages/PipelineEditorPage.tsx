import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
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

export default function PipelineEditorPage() {
const { pipelineId } = useParams({ from: "/pipeline/$pipelineId/edit" });
const [config, setConfig] = useState<PipelineConfig | null>(null);
const [errors, setErrors] = useState<string[]>([]);
const [compiling, setCompiling] = useState(false);

useEffect(() => {
fetchPipeline(pipelineId)
.then(setConfig)
.catch(() => toast.error("Pipeline не знайдено"));
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

if (!config) {
return (
<div className="flex h-screen items-center justify-center bg-[var(--bg-base)] font-mono text-sm text-[var(--text-secondary)]">
Завантаження пайплайну…
</div>
);
}
return (
<div className="flex h-screen flex-col bg-[var(--bg-base)] antialiased">
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


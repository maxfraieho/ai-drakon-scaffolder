import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, ScanSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
streamJob,
startAnalysis,
type AnalyzeResult,
type AnalyzedFunction,
} from "@/lib/pipeline-api";
import { kbContribute } from "@/lib/kb-api";

interface CodeAnalysisPanelProps {
open: boolean;
onClose: () => void;
onImportIr: (ir: AnalyzedFunction) => void;
}

type Status = "idle" | "running" | "done" | "error";

export function CodeAnalysisPanel({ open, onClose, onImportIr }: CodeAnalysisPanelProps) {
const [source, setSource] = useState("");
const [filePath, setFilePath] = useState("module.py");
const [status, setStatus] = useState<Status>("idle");
const [jobId, setJobId] = useState<string | null>(null);
const [result, setResult] = useState<AnalyzeResult | null>(null);
const [errorMsg, setErrorMsg] = useState<string>("");
const [elapsed, setElapsed] = useState(0);
const [kbSaving, setKbSaving] = useState(false);
const [kbSaved, setKbSaved] = useState(false);
const startedAtRef = useRef<number | null>(null);

useEffect(() => {
if (status !== "running") return;
startedAtRef.current = Date.now();
setElapsed(0);
const id = setInterval(() => {
if (startedAtRef.current) {
setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
}
}, 1000);
return () => clearInterval(id);
}, [status]);

useEffect(() => {
if (status !== "running" || !jobId) return;
return streamJob<AnalyzeResult>(jobId, (data) => {
if (data.status === "done") {
setResult(data.result);
setStatus("done");
toast.success("Аналіз завершено");
} else if (data.status === "error") {
setErrorMsg(data.error || "Невідома помилка");
setStatus("error");
}
});
}, [status, jobId]);

const runAnalysis = async () => {
if (!source.trim()) {
toast.error("Вставте код для аналізу");
return;
}
setStatus("running");
setResult(null);
setErrorMsg("");
setKbSaved(false);
try {
const resp = await startAnalysis(source, filePath || "module.py");
setJobId(resp.job_id);
} catch (e) {
setStatus("error");
setErrorMsg(e instanceof Error ? e.message : "Не вдалося запустити");
}
};

const reset = () => {
setStatus("idle");
setJobId(null);
setResult(null);
setErrorMsg("");
setElapsed(0);
setKbSaved(false);
};

const handleSaveToKb = async () => {
if (!result || kbSaving || kbSaved) return;
setKbSaving(true);
try {
const token = localStorage.getItem("jwt") ?? "";
await kbContribute(
{
code: source,
ir_yaml: JSON.stringify(result.drakon_ir, null, 2),
language: "python",
description: filePath,
job_id: jobId ?? undefined,
},
token
);
setKbSaved(true);
toast.success("Збережено до KB", { description: filePath });
} catch {
toast.error("Помилка збереження");
} finally {
setKbSaving(false);
}
};

if (!open) return null;

return (
<aside className="flex h-full w-full shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] xl:w-[380px]">
<header className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3">
<div className="flex items-center gap-2">
<ScanSearch className="h-3.5 w-3.5 text-[var(--accent-amber)]" aria-hidden="true" />
<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
Аналіз коду
</span>
</div>
<button
type="button"
onClick={onClose}
aria-label="Закрити панель"
className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
>
<X className="h-3.5 w-3.5" aria-hidden="true" />
</button>
</header>

<div className="flex-1 overflow-y-auto p-3 space-y-3">
<div className="space-y-1.5">
<label className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
Шлях файлу
</label>
<Input
value={filePath}
onChange={(e) => setFilePath(e.target.value)}
placeholder="module.py"
disabled={status === "running"}
className="font-mono text-xs"
/>
</div>
<div className="space-y-1.5">
<label className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
Python код
</label>
<Textarea
value={source}
onChange={(e) => setSource(e.target.value)}
placeholder="def hello():&#10; print('hello')"
rows={12}
disabled={status === "running"}
className="font-mono text-xs resize-y"
/>
</div>
<Button
type="button"
onClick={runAnalysis}
disabled={status === "running"}
className="w-full bg-[var(--accent-amber)] text-black hover:bg-[var(--accent-amber)]/90"
>
{status === "running" ? (
<>
<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
Аналіз… {elapsed}s
</>
):(
<>Аналізувати</>
)}
</Button>

{status === "running" && (
<div className="border border-[var(--border-default)] bg-[var(--surface-container)] p-3 flex flex-col gap-2">
<div className="flex justify-between items-center">
<div className="flex items-center gap-2">
<span className="relative flex h-2 w-2">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-amber)] opacity-75" />
<span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-amber)]" />
</span>
<span className="font-mono text-[11px] text-[var(--accent-amber)] uppercase font-bold tracking-wider">
ВИКОНУЄТЬСЯ
</span>
</div>
<span className="font-mono text-[11px] text-[var(--text-muted)]">{elapsed}s</span>
</div>
<div className="w-full bg-[var(--bg-base)] h-[2px] overflow-hidden">
<div
className="bg-[var(--accent-amber)] h-full transition-all"
style={{ width: ${Math.min(90, elapsed * 5)}% }}
/>
</div>
<p className="text-[11px] text-[var(--text-secondary)] italic">
Pipeline A запущено. Очікуємо результат обробки синтаксичного дерева...
</p>
</div>
)}

{status === "done" && result && (
<div className="flex flex-col gap-3">
<div className="flex items-center justify-between px-3 py-2 border border-emerald-500/30 bg-emerald-500/5">
<div className="flex items-center gap-2 text-emerald-400">
<span className="text-[16px]">✓</span>
<span className="font-mono text-[11px] font-bold uppercase">
АНАЛІЗ ЗАВЕРШЕНО
</span>
</div>
<div className="flex items-center gap-2">
<span className="font-mono text-[11px] text-[var(--text-muted)]">{elapsed}s</span>
<button
type="button"
onClick={handleSaveToKb}
disabled={kbSaving || kbSaved}
className="flex items-center gap-1.5 rounded border border-[var(--accent-amber)]/40 px-2 py-1 font-mono text-[10px] uppercase text-[var(--accent-amber)] transition-colors hover:bg-[var(--accent-amber)]/10 disabled:opacity-50"
>
{kbSaved ? "✓ Збережено" : kbSaving ? "..." : "Save to KB"}
</button>
<button
type="button"
onClick={reset}
className="font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase"
>
Новий аналіз
</button>
</div>
</div>

<div className="flex flex-col gap-1">
<div className="flex justify-between items-center">
<span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
DRAKON IR OUTPUT
</span>
<span className="font-mono text-[10px] text-[var(--text-muted)]">
CC: {result.cyclomatic_complexity}
</span>
</div>
<div className="relative group">
<pre className="w-full h-[320px] bg-[var(--bg-base)] border border-[var(--border-default)] p-3 font-mono text-[11px] overflow-auto text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
{JSON.stringify(result.drakon_ir, null, 2)}
</pre>
<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
<button
type="button"
onClick={async () => {
await navigator.clipboard.writeText(JSON.stringify(result.drakon_ir, null, 2));
toast.success("Скопійовано");
}}
className="bg-[var(--surface-container)]/80 border border-[var(--border-default)] p-1 text-[var(--text-secondary)] hover:text-[var(--accent-amber)]"
>
<Copy className="h-3.5 w-3.5" />
</button>
</div>
</div>
</div>

<div className="grid grid-cols-3 gap-2">
<div className="bg-[var(--bg-base)] border border-[var(--border-default)] p-2">
<div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">Functions</div>
<div className="font-mono text-[13px] text-[var(--text-primary)]">
{result.drakon_ir.length}
</div>
</div>
<div className="bg-[var(--bg-base)] border border-[var(--border-default)] p-2">
<div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">CC</div>
<div className="font-mono text-[13px] text-[var(--text-primary)]">
{result.cyclomatic_complexity}
</div>
</div>
<div className="bg-[var(--bg-base)] border border-[var(--border-default)] p-2">
<div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">Level</div>
<div className="font-mono text-[13px] text-[var(--text-primary)]">
{result.tree_level}
</div>
</div>
</div>

<div className="flex flex-col gap-1">
{result.drakon_ir.map((fn, i) => {
const valid = !fn.error && (!fn.validation_errors || fn.validation_errors.length === 0);
return valid ? (
<button
key={${fn.name}-${i}}
type="button"
onClick={() => onImportIr(fn)}
className="w-full flex items-center justify-between px-2 py-1.5 border border-[var(--border-default)] bg-[var(--bg-base)] hover:border-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/5 transition-all font-mono text-xs text-[var(--text-primary)]"
>
<span>{fn.name}</span>
<span className="text-[var(--text-muted)]">↓ Імпортувати</span>
</button>
) : null;
})}
</div>
</div>
)}

{status === "error" && (
<div className="border border-red-500/30 bg-red-500/5 p-3 flex flex-col gap-2">
<p className="font-mono text-[11px] text-red-400">{errorMsg || "Помилка"}</p>
<button
type="button"
onClick={reset}
className="w-full border border-[var(--border-default)] py-1 font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-amber)] transition-colors"
>
Повторити
</button>
</div>
)}
</div>
</aside>
);
}


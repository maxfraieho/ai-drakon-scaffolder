import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
streamJob,
startGeneration,
type GenerateResult,
} from "@/lib/pipeline-api";
import {
loadGenerationHistory,
saveGenerationHistory,
type GenerationHistoryItem,
} from "@/lib/pipeline-history";
import { kbContribute } from "@/lib/kb-api";

interface CodeGenerationPanelProps {
open: boolean;
onClose: () => void;
diagramIr: object | null;
diagramName?: string;
}

type Status = "idle" | "running" | "done" | "error";
type Lang = "python" | "typescript" | "javascript";

const LANGS: { id: Lang; label: string; short: string }[] = [
{ id: "python", label: "PYTHON", short: "PY" },
{ id: "typescript", label: "TYPESCRIPT", short: "TS" },
{ id: "javascript", label: "JAVASCRIPT", short: "JS" },
];

const MONACO_LANG: Record<Lang, string> = {
python: "python",
typescript: "typescript",
javascript: "javascript",
};

function formatTime(ts: number): string {
const d = new Date(ts);
return  `${String(d.getHours()).padStart(2,`
"0`)}:${String(d.getMinutes()).padStart(2, `0")};
}

export function CodeGenerationPanel({
open,
onClose,
diagramIr,
diagramName,
}: CodeGenerationPanelProps) {
const [lang, setLang] = useState<Lang>("python");
const [description, setDescription] = useState("");
const [status, setStatus] = useState<Status>("idle");
const [jobId, setJobId] = useState<string | null>(null);
const [result, setResult] = useState<GenerateResult | null>(null);
const [errorMsg, setErrorMsg] = useState("");
const [elapsed, setElapsed] = useState(0);
const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
const [kbSaving, setKbSaving] = useState(false);
const [kbSaved, setKbSaved] = useState(false);
const startedAtRef = useRef<number | null>(null);

useEffect(() => {
if (open) setHistory(loadGenerationHistory());
}, [open]);

useEffect(() => {
setDescription("");
setStatus("idle");
setResult(null);
setErrorMsg("");
}, [diagramIr]);

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
return streamJob<GenerateResult>(jobId, (data) => {
if (data.status === "done") {
const elapsedNow = startedAtRef.current
? Math.floor((Date.now() - startedAtRef.current) / 1000)
: 0;
setResult(data.result);
setStatus("done");
setKbSaved(false);
toast.success("Код згенеровано");
saveGenerationHistory({
scheme: diagramName || "diagram",
language: lang,
description,
code: data.result.code,
iterations: data.result.iterations,
elapsed: elapsedNow,
});
setHistory(loadGenerationHistory());
} else if (data.status === "error") {
setErrorMsg(data.error || "Невідома помилка");
setStatus("error");
}
});
}, [status, jobId, diagramName, lang, description]);

const runGenerate = async () => {
if (!diagramIr) {
toast.error("Немає вибраної схеми");
return;
}
setStatus("running");
setResult(null);
setErrorMsg("");
try {
const resp = await startGeneration(diagramIr, lang, description.trim());
setJobId(resp.job_id);
} catch (e) {
setStatus("error");
setErrorMsg(e instanceof Error ? e.message : "Не вдалося запустити");
}
};

const handleRegenerate = () => {
setStatus("idle");
setResult(null);
setErrorMsg("");
setElapsed(0);
setJobId(null);
setKbSaved(false);
};
const copyCode = async () => {
if (!result?.code) return;
try {
await navigator.clipboard.writeText(result.code);
toast.success("Скопійовано");
} catch {
toast.error("Не вдалося скопіювати");
}
};

const handleSaveToKb = async () => {
if (!result?.code || kbSaving || kbSaved) return;
setKbSaving(true);
try {
const token = localStorage.getItem("jwt") ?? "";
await kbContribute(
{
code: result.code,
ir_yaml: description ?? "",
language: lang,
description: description ?? "",
job_id: jobId ?? undefined,
},
token
);
setKbSaved(true);
toast.success("Збережено до KB", {
description:`${lang}` · ${result.code.split("\n").length} рядків,
});
} catch {
toast.error("Помилка збереження");
} finally {
setKbSaving(false);
}
};

const replayHistory = (item: GenerationHistoryItem) => {
setLang(item.language as Lang);
setDescription(item.description);
setResult({
code: item.code,
language: item.language,
syntax_errors: [],
iterations: item.iterations,
} as GenerateResult);
setElapsed(item.elapsed);
setStatus("done");
setKbSaved(false);
};

if (!open) return null;

const hasResult = status === "done" || status === "error";
const panelHeight = hasResult ? "h-[480px]" : "h-64";
const running = status === "running";
const disabled = !diagramIr || running;

return (
<section
className={cn(
"antialiased flex shrink-0 flex-col border-t bg-background z-20 transition-[height] duration-200 ease-in-out shadow-[0_-4px_24px_rgba(0,0,0,0.5)]",
panelHeight,
)}
style={{ borderColor: "var(--color-outline-variant, #534434)" }}
>
{/ Header /}
<header
className="flex h-10 shrink-0 items-center justify-between px-4 border-b bg-muted"
style={{
borderColor: "var(--color-outline-variant, #534434)",
}}
>
<div className="flex items-center gap-2">
<span
className="material-symbols-outlined text-[18px]"
style={{ color: "var(--color-primary-container, #f59e0b)" }}
>
code
</span>
<span
className="font-mono text-[11px] font-semibold uppercase tracking-widest"
style={{ color: "var(--color-primary-container, #f59e0b)" }}
>
Генерувати код
</span>
</div>
<div className="flex items-center gap-4">
<div
className="flex rounded-sm border p-px"
style={{
background: "var(--color-surface-container-highest, #353534)",
borderColor: "var(--color-outline-variant, #534434)",
}}
>
{LANGS.map((l) => (
<button
key={l.id}
type="button"
onClick={() => setLang(l.id)}
className={cn(
"px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider rounded-[2px] transition-colors active:scale-[0.96] transition-transform duration-75 min-h-[28px]",
lang === l.id
? "text-black"
: "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
)}
style={
lang === l.id
? { background: "var(--color-primary-container, #f59e0b)" }
: undefined
}
>
{l.short}
</button>
))}
</div>
<button
type="button"
onClick={onClose}
aria-label="Закрити панель"
className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors active:scale-[0.96] duration-75"
>
<span className="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
</header>

{/ Body /}
{!hasResult ? (
<div className="flex flex-1 overflow-hidden">
{/ Left form /}
<div
className="flex flex-1 flex-col gap-2 p-3 border-r"
style={{ borderColor: "var(--color-outline-variant, #534434)" }}
>
{/ Scheme row /}
<div className="flex items-center gap-2">
<span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
СХЕМА:
</span>
<div
className={cn(
"flex flex-1 items-center justify-between rounded-sm border px-2 h-[32px] font-mono text-[12px] bg-background",
diagramIr
? "text-[var(--color-on-surface)]"
: "text-[var(--color-on-surface-variant)] opacity-60",
)}
style={{
borderColor: "var(--color-outline-variant, #534434)",
}}
>
<span className="truncate">
{diagramName || (diagramIr ? "Поточна схема" : "Виберіть схему…")}
</span>
</div>
</div>

{/ Description /}
<div className="flex flex-1 flex-col min-h-0">
<textarea
value={description}
onChange={(e) => setDescription(e.target.value)}
disabled={running}
placeholder="Опис поведінки (необов'язково)…"
className="flex-1 w-full resize-none rounded-sm border p-2 font-mono text-[12px] text-[var(--color-on-surface)] bg-background outline-none placeholder:text-[var(--color-on-surface-variant)]/50 focus:border-[var(--color-primary-container)] focus:ring-1 focus:ring-[var(--color-primary-container)]"
style={{
borderColor: "var(--color-outline-variant, #534434)",
}}
/>
</div>

{/ Action row /}
<div className="flex items-center justify-between gap-2">
<span className="font-mono text-[10px] italic text-[var(--color-on-surface-variant)]">
{!diagramIr
? "Виберіть схему для початку генерації"
: running
? `Pipeline B виконується… ${elapsed}s`
: ""}
</span>
<button
type="button"
onClick={runGenerate}
disabled={disabled}
className={cn(
"flex items-center gap-1 rounded-sm px-6 h-[40px] font-mono text-[11px] font-semibold uppercase tracking-wider transition-all active:scale-[0.96] duration-75 min-h-[40px]",
disabled
? "cursor-not-allowed opacity-50"
: "hover:brightness-110",
)}
style={{
background: "var(--color-primary-container, #f59e0b)",
color: "#2a1700",
}}
>
{running ? (
<span className="material-symbols-outlined animate-spin text-[18px]">
progress_activity
</span>
):(
<span className="material-symbols-outlined text-[18px]">bolt</span>
)}
{running ? "ГЕНЕРАЦІЯ…" : "ГЕНЕРУВАТИ"}
</button>
</div>
</div>
{/ Right history /}
<div
className="w-[320px] flex flex-col bg-muted/40"
>
<div
className="h-8 flex items-center px-4 border-b font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)]"
style={{ borderColor: "var(--color-outline-variant, #534434)" }}
>
Останні генерації
</div>
<div className="flex-1 overflow-y-auto p-1 flex flex-col gap-1">
{history.length === 0 ? (
<div className="p-3 font-mono text-[11px] italic text-[var(--color-on-surface-variant)]/70">
Історія порожня
</div>
):(
history.map((item) => (
<button
key={item.id}
type="button"
onClick={() => replayHistory(item)}
className="group flex items-center justify-between gap-2 p-2 rounded-sm border border-transparent cursor-pointer text-left min-h-[40px] hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-outline-variant)] transition-colors duration-150"
>
<div className="flex items-center gap-2 overflow-hidden">
<span
className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold font-mono uppercase shrink-0"
style={{
background:
item.language === "python"
? "var(--color-primary-container, #f59e0b)"
: "var(--color-surface-container-highest, #353534)",
color:
item.language === "python"
? "#2a1700"
: "var(--color-on-surface)",
}}
>
{item.language.slice(0, 2)}
</span>
<div className="flex flex-col truncate">
<span className="font-mono text-[12px] text-[var(--color-on-surface)] truncate">
{item.scheme}
</span>
<span className="font-mono text-[10px] text-[var(--color-on-surface-variant)] tabular-nums">
{formatTime(item.timestamp)} · {item.iterations} iter
</span>
</div>
</div>
<span className="opacity-0 group-hover:opacity-100 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary-container)] transition-opacity p-1">
<span className="material-symbols-outlined text-[16px]">
refresh
</span>
</span>
</button>
))
)}
</div>
</div>
</div>
):(
/ DONE / ERROR — Monaco view /
<div className="flex flex-1 flex-col min-h-0">
{/ Status bar /}
<div
className="flex items-center justify-between px-4 py-1.5 border-b shrink-0 bg-muted"
style={{
borderColor: "var(--color-outline-variant, #534434)",
}}
>
<div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
{status === "done" ? (
<>
<span className="text-[#4ade80]">✓</span>
<span className="text-[#4ade80]">КОД ЗГЕНЕРОВАНО</span>
<span className="opacity-40 mx-1">·</span>
<span className="text-[var(--color-on-surface-variant)]">
syntax:{" "}
<span
className={
result && result.syntax_errors.length === 0
? "text-[#4ade80]"
: "text-[#ffb4ab]"
}
>
{result && result.syntax_errors.length === 0
? "OK"
: `${result?.syntax_errors.length ?? 0} err`}
</span>
</span>
</>
):(
<>
<span className="text-[#ffb4ab]">✗</span>
<span className="text-[#ffb4ab]">ПОМИЛКА</span>
<span className="opacity-40 mx-1">·</span>
<span className="text-[var(--color-on-surface-variant)] normal-case">
{errorMsg}
</span>
</>
)}
</div>
<div className="flex items-center gap-3 font-mono text-[11px]">
<span className="tabular-nums text-[var(--color-on-surface-variant)]">
{elapsed}s
<span className="opacity-40 mx-1">|</span>
{result?.iterations ?? 0} iter
</span>
<button
type="button"
onClick={copyCode}
disabled={!result?.code}
className="flex items-center gap-1 px-2 py-1 rounded-[2px] opacity-60 hover:opacity-100 transition-opacity active:scale-[0.96] duration-75 min-h-[32px] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]"
>
<span className="material-symbols-outlined text-[14px]">
content_copy
</span>
COPY
</button>
<button
type="button"
onClick={handleSaveToKb}
disabled={kbSaving || kbSaved || !result?.code}
className="flex items-center gap-1 rounded border border-[var(--color-primary-container)]/40 px-2 py-1 min-h-[32px] font-mono text-[11px] uppercase text-[var(--color-primary-container)] transition-colors hover:bg-[var(--color-primary-container)]/10 disabled:opacity-50"
>
{kbSaved ? "✓ Збережено" : kbSaving ? "..." : "Save to KB"}
</button>
<button
type="button"
onClick={handleRegenerate}
className="flex items-center gap-1 px-2 py-1 rounded-[2px] transition-colors active:scale-[0.96] duration-75 min-h-[32px] text-[var(--color-primary-container)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]"
>
<span className="material-symbols-outlined text-[14px]">
refresh
</span>
ПЕРЕГЕНЕРУВАТИ
</button>
</div>
</div>

{/ Monaco /}
<div className="flex-1 min-h-0">
{result?.code ? (
<Editor
height="100%"
language={MONACO_LANG[lang]}
value={result.code}
theme={typeof document !== "undefined" &&
document.documentElement.classList.contains("dark") ? "vs-dark" : "vs-light"}
options={{
readOnly: true,
minimap: { enabled: false },
scrollBeyondLastLine: false,
fontSize: 12,
lineHeight: 18,
fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
fontLigatures: true,
padding: { top: 12, bottom: 12 },
renderLineHighlight: "none",
overviewRulerLanes: 0,
scrollbar: {
verticalScrollbarSize: 6,
horizontalScrollbarSize: 6,
},
}}
/>
):(
<div className="flex h-full items-center justify-center p-6 font-mono text-[12px] text-[var(--color-on-surface-variant)]">
{errorMsg || "Немає коду"}
</div>
)}
</div>
</div>
)}
</section>
);
}


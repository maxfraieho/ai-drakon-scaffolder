import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AgentNode } from "@/lib/agent-studio-data";

interface Props {
node: AgentNode;
pipelineId: string;
onClose: () => void;
}

export function NodeInspector({ node, pipelineId, onClose }: Props) {
const storageKey = agent-prompt:${pipelineId}:${node.id};
const [editing, setEditing] = useState(false);
const [draft, setDraft] = useState(node.prompt ?? "");
const [saved, setSaved] = useState<string | null>(null);
useEffect(() => {
setEditing(false);
setSaved(null);
try {
const stored = localStorage.getItem(storageKey);
setDraft(stored ?? node.prompt ?? "");
} catch {
setDraft(node.prompt ?? "");
}
}, [node.id, storageKey, node.prompt]);

const handleSave = () => {
try {
localStorage.setItem(storageKey, draft);
} catch {
/ ignore /
}
setEditing(false);
setSaved(new Date().toLocaleTimeString());
};

return (
<aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
<header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] px-3">
<div className="flex min-w-0 items-center gap-2">
<span
className={cn(
"material-symbols-outlined text-[18px]",
node.hasPrompt
? "text-[var(--color-on-secondary-container)]"
: "text-[var(--color-tertiary)]"
)}
>
{node.icon}
</span>
<span className="font-headline-sm truncate text-[var(--color-on-surface)]">
{node.label}
</span>
</div>
<button
onClick={onClose}
className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)]"
aria-label="Закрити інспектор"
>
<span className="material-symbols-outlined text-[18px]">close</span>
</button>
</header>

<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
<section className="flex flex-col gap-2">
<span className="font-mono-label uppercase text-[var(--color-on-surface-variant)]">
Тип вузла
</span>
<div className="flex flex-wrap items-center gap-2">
<span
className={cn(
"rounded px-2 py-0.5 font-mono-label uppercase",
node.hasPrompt
? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
: "bg-[var(--color-surface-container-high)] text-[var(--color-tertiary)]"
)}
>
{node.hasPrompt ? "LLM" : "DETERMINISTIC"}
</span>
<span className="rounded border border-[var(--color-outline-variant)] px-2 py-0.5 font-mono-label uppercase text-[var(--color-on-surface-variant)]">
{node.type}
</span>
</div>
</section>

<section className="flex flex-col gap-2">
<span className="font-mono-label uppercase text-[var(--color-on-surface-variant)]">
Опис
</span>
<p className="font-ui-sm leading-relaxed text-[var(--color-on-surface)]">
{node.description}
</p>
</section>

{node.hasPrompt && (
<section className="flex min-h-0 flex-1 flex-col gap-2">
<div className="flex items-center justify-between">
<span className="font-mono-label uppercase text-[var(--color-on-surface-variant)]">
Системний промпт
</span>
{!editing ? (
<button
onClick={() => setEditing(true)}
className="flex items-center gap-1 rounded border border-[var(--color-outline-variant)] px-2 py-0.5 font-mono-label text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]"
>
<span className="material-symbols-outlined text-[14px]">edit</span>
EDIT
</button>
):(
<div className="flex items-center gap-1">
<button
onClick={() => {
setEditing(false);
try {
const stored = localStorage.getItem(storageKey);
setDraft(stored ?? node.prompt ?? "");
} catch {
setDraft(node.prompt ?? "");
}
}}
className="flex items-center gap-1 rounded border border-[var(--color-outline-variant)] px-2 py-0.5 font-mono-label text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)]"
>
CANCEL
</button>
<button
onClick={handleSave}
className="flex items-center gap-1 rounded bg-[var(--color-primary-container)] px-2 py-0.5 font-mono-label uppercase text-[var(--color-on-primary-container)] hover:opacity-90"
>
<span className="material-symbols-outlined text-[14px]">save</span>
SAVE
</button>
</div>
)}
</div>
<textarea
readOnly={!editing}
value={draft}
onChange={(e) => setDraft(e.target.value)}
className={cn(
"font-mono-code min-h-[280px] flex-1 resize-none rounded border bg-[var(--color-surface-container-lowest)] p-2.5 text-[var(--color-on-surface)] outline-none transition-colors",
editing
? "border-[var(--color-primary-container)]"
: "cursor-default border-[var(--color-outline-variant)]"
)}
/>
{saved && (
<span className="font-mono-label text-[var(--color-tertiary)]">
● Збережено о {saved}
</span>
)}
</section>
)}

{!node.hasPrompt && (
<section className="rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-3">
<p className="font-ui-sm text-[var(--color-on-surface-variant)]">
Детерміністичний вузол — без LLM-промпту. Логіка реалізована в коді.
</p>
</section>
)}
</div>
</aside>
);
}
---
### components/agents/PipelineGraph.tsx
**Розмір:** 2,367 байт


import { cn } from "@/lib/utils";
import type { AgentPipeline } from "@/lib/agent-studio-data";

interface Props {
pipeline: AgentPipeline;
}

export function PipelineGraph({ pipeline }: Props) {
return (
<div className="rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
<div className="mb-3 flex items-center justify-between">
<span className="font-mono-label uppercase text-[var(--color-on-surface-variant)]">
LangGraph StateGraph
</span>
<span className="font-mono-label text-[var(--color-on-surface-variant)]">
{pipeline.nodes.length} nodes
</span>
</div>
<div className="flex flex-wrap items-center gap-2">
{pipeline.nodes.map((node, i) => {
const isLlm = node.hasPrompt;
return (
<div key={node.id} className="flex items-center gap-2">
<div
className={cn(
"flex items-center gap-2 rounded border px-2.5 py-1.5",
isLlm
? "border-[var(--color-secondary-container)] bg-[color-mix(in_oklab,var(--color-secondary-container)_20%,transparent)]"
: "border-[color-mix(in_oklab,var(--color-tertiary)_40%,transparent)] bg-[var(--color-surface-container-low)]"
)}
>
<span
className={cn(
"material-symbols-outlined text-[16px]",
isLlm
? "text-[var(--color-on-secondary-container)]"
: "text-[var(--color-tertiary)]"
)}
>
{node.icon}
</span>
<span
className={cn(
"font-mono-code",
isLlm
? "text-[var(--color-on-secondary-container)]"
: "text-[var(--color-on-surface)]"
)}
>
{node.label}
</span>
</div>
{i < pipeline.nodes.length - 1 && (
<span className="material-symbols-outlined text-[14px] text-[var(--color-outline)]">
arrow_forward
</span>
)}
</div>
);
})}
</div>
</div>
);
}


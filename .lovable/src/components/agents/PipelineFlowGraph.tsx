import { useEffect, useMemo, useState } from "react";
import {
ReactFlow,
Background,
Controls,
type Node,
type Edge,
type NodeTypes,
Handle,
Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import {
fetchPipeline,
type NodeConfig,
type PipelineConfig,
} from "@/lib/pipeline-config-api";

interface NodeData {
label: string;
description: string;
isLlm: boolean;
isDeterministic: boolean;
type: string;
selected: boolean;
[key: string]: unknown;
}

function ActionNode({ data }: { data: NodeData }) {
return (
<>
<Handle
type="target"
position={Position.Left}
className="!bg-[var(--color-outline)]"
/>
<div
className={cn(
"flex min-w-[120px] flex-col gap-0.5 rounded border px-2.5 py-2 transition-all duration-150",
data.selected
? "border-[var(--color-primary-container)] shadow-[0_0_0_2px_var(--color-primary-container)]"
: "border-[var(--color-outline-variant)]",
data.isLlm
? "bg-[color-mix(in_oklab,var(--color-secondary-container)_25%,transparent)]"
: "bg-[var(--color-surface-container-low)]"
)}
>
<span
className={cn(
"font-mono-code text-[11px]",
data.isLlm
? "text-[var(--color-on-secondary-container)]"
: "text-[var(--color-on-surface)]"
)}
>
{data.label}
</span>
{data.isLlm && (
<span className="font-mono-label text-[9px] uppercase text-[var(--color-secondary)]">
LLM
</span>
)}
</div>
<Handle
type="source"
position={Position.Right}
className="!bg-[var(--color-outline)]"
/>
</>
);
}

function DecisionNode({ data }: { data: NodeData }) {
return (
<>
<Handle
type="target"
position={Position.Left}
className="!bg-[var(--color-outline)]"
/>
<div
className={cn(
"flex min-w-[120px] flex-col gap-0.5 rounded border border-dashed px-2.5 py-2 transition-all duration-150",
data.selected
? "border-[var(--color-primary-container)] shadow-[0_0_0_2px_var(--color-primary-container)]"
: "border-[var(--color-tertiary)]",
"bg-[color-mix(in_oklab,var(--color-tertiary-container)_20%,transparent)]"
)}
>
<span className="font-mono-label text-[9px] uppercase text-[var(--color-tertiary)]">
◇ decision
</span>
<span className="font-mono-code text-[11px] text-[var(--color-on-surface)]">
{data.label}
</span>
</div>
<Handle
type="source"
position={Position.Bottom}
id="yes"
className="!bg-[var(--color-tertiary)]"
/>
<Handle
type="source"
position={Position.Right}
id="no"
className="!bg-[var(--color-outline)]"
/>
</>
);
}

function TerminatorNode({ data }: { data: NodeData }) {
return (
<>
<Handle
type="target"
position={Position.Left}
className="!bg-[var(--color-outline)]"
/>
<div
className={cn(
"flex min-w-[120px] flex-col gap-0.5 rounded-full border px-3 py-1.5 transition-all duration-150",
data.selected
? "border-[var(--color-primary-container)] shadow-[0_0_0_2px_var(--color-primary-container)]"
: "border-[var(--color-outline-variant)]",
"bg-[var(--color-surface-container)]"
)}
>
<span className="font-mono-code text-[11px] text-[var(--color-on-surface-variant)]">
{data.label}
</span>
</div>
</>
);
}

const NODE_TYPES: NodeTypes = {
action: ActionNode as never,
decision: DecisionNode as never,
loop_start: ActionNode as never,
loop_end: ActionNode as never,
terminator: TerminatorNode as never,
};

const NODE_W = 150;
const NODE_H = 56;
const H_GAP = 60;
const V_GAP = 80;

function layoutNodes(
nodes: NodeConfig[],
edges: Array<{ from_node: string; to_node: string }>
): Map<string, { x: number; y: number }> {
const adj = new Map<string, string[]>();
const inDeg = new Map<string, number>();
for (const n of nodes) {
adj.set(n.id, []);
inDeg.set(n.id, 0);
}
for (const e of edges) {
adj.get(e.from_node)?.push(e.to_node);
inDeg.set(e.to_node, (inDeg.get(e.to_node) ?? 0) + 1);
}
const col = new Map<string, number>();
const queue: string[] = [];
for (const [id, deg] of inDeg) {
if (deg === 0) queue.push(id);
}
while (queue.length) {
const id = queue.shift()!;
const c = col.get(id) ?? 0;
for (const next of adj.get(id) ?? []) {
col.set(next, Math.max(col.get(next) ?? 0, c + 1));
inDeg.set(next, (inDeg.get(next) ?? 0) - 1);
if (inDeg.get(next) === 0) queue.push(next);
}
}

const cols = new Map<number, string[]>();
for (const n of nodes) {
const c = col.get(n.id) ?? 0;
if (!cols.has(c)) cols.set(c, []);
cols.get(c)!.push(n.id);
}

const positions = new Map<string, { x: number; y: number }>();
for (const [c, ids] of cols) {
ids.forEach((id, row) => {
positions.set(id, {
x: c * (NODE_W + H_GAP),
y: row * (NODE_H + V_GAP),
});
});
}
return positions;
}

interface Props {
pipelineId: string;
selectedNodeId?: string | null;
onNodeClick?: (nodeId: string) => void;
}

export function PipelineFlowGraph({
pipelineId,
selectedNodeId,
onNodeClick,
}: Props) {
const [config, setConfig] = useState<PipelineConfig | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
setConfig(null);
setError(null);
fetchPipeline(pipelineId)
.then(setConfig)
.catch((e: unknown) =>
setError(e instanceof Error ? e.message : "Не вдалося завантажити пайплайн")
);
}, [pipelineId]);

const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
if (!config) return { nodes: [], edges: [] };

const positions = layoutNodes(config.nodes, config.edges);
const rfNodes: Node[] = config.nodes.map((n) => ({
id: n.id,
type: n.type,
position: positions.get(n.id) ?? { x: 0, y: 0 },
data: {
label: n.label,
description: n.description,
isLlm: n.is_llm,
isDeterministic: n.is_deterministic,
type: n.type,
selected: n.id === selectedNodeId,
},
}));

const rfEdges: Edge[] = config.edges.map((e, i) => ({
id: e-${i},
source: e.from_node,
target: e.to_node,
sourceHandle: e.condition ?? undefined,
label: e.condition ?? e.label ?? undefined,
labelStyle: { fontFamily: "JetBrains Mono, monospace", fontSize: 10 },
style: {
stroke:
e.condition === "yes"
? "var(--color-tertiary)"
: "var(--color-outline-variant)",
strokeWidth: 1.5,
},
animated: false,
}));

return { nodes: rfNodes, edges: rfEdges };
}, [config, selectedNodeId]);

if (error) {
return (
<div className="flex h-48 items-center justify-center rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
<span className="font-mono-label text-[var(--color-error)]">{error}</span>
</div>
);
}

if (!config) {
return (
<div className="flex h-48 items-center justify-center rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
<span className="font-mono-label text-[var(--color-on-surface-variant)]">
Завантаження…
</span>
</div>
);
}

return (
<div className="h-72 overflow-hidden rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
<ReactFlow
nodes={nodes}
edges={edges}
nodeTypes={NODE_TYPES}
fitView
fitViewOptions={{ padding: 0.2 }}
proOptions={{ hideAttribution: true }}
nodesDraggable={false}
nodesConnectable={false}
elementsSelectable
onNodeClick={(_e, node) => onNodeClick?.(node.id)}
>
<Background color="var(--color-outline-variant)" gap={24} size={1} />
<Controls
showInteractive={false}
className="!bg-[var(--color-surface)] !border-[var(--color-outline-variant)] !shadow-none"
/>
</ReactFlow>
</div>
);
}
---
### components/agents/AgentChatPanel.tsx
**Розмір:** 18,680 байт


import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
AlertCircle,
Bot,
ChevronDown,
ChevronUp,
ExternalLink,
Send,
ThumbsDown,
Trash2,
User as UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendFeedback, getAgentLabel } from "@/lib/agent-api";
import { DEFAULT_FOLDER } from "@/lib/folder-storage";
import { api } from "@/lib/api";
import { useAgentChatStore } from "@/store/useAgentChatStore";
import { useAgentHealth } from "@/hooks/useAgentHealth";
import type { AgentId, AgentMessage } from "@/types/agent-chat";
import type { DrakonDiagram } from "@/types/drakon";

const AGENTS: AgentId[] = ["drakon", "architect", "docs"];

const WELCOME: Record<AgentId, string> = {
drakon: "Готово. Вставте Python-код — згенерую DRAKON-схему.",
architect: "Готово. Запитайте про архітектуру проєкту.",
docs: "Готово. Запитайте про документацію та контекст.",
};

interface SlotInfo {
active_model: string | null;
display_name: string;
health: string;
top_candidate?: string | null;
}

function useSlotInfo(slotName: string | null) {
const [info, setInfo] = useState<SlotInfo | null>(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
if (!slotName) {
setInfo(null);
return;
}
let cancelled = false;
setLoading(true);
const workerUrl = (
typeof window !== "undefined"
? localStorage.getItem("app_worker_url") ||
"https://drakon-mcp-worker.maxfraieho.workers.dev"
: "https://drakon-mcp-worker.maxfraieho.workers.dev"
).replace(/\/+$/, "");
fetch(${workerUrl}/v1/proxy/slot-info?slot=${encodeURIComponent(slotName)})
.then((r) => r.json())
.then((data) => {
if (!cancelled) setInfo(data as SlotInfo);
})
.catch(() => {
if (!cancelled) setInfo(null);
})
.finally(() => {
if (!cancelled) setLoading(false);
});
return () => {
cancelled = true;
};
}, [slotName]);

return { info, loading };
}

interface Props {
className?: string;
}

export function AgentChatPanel({ className }: Props) {
const navigate = useNavigate();
const sessions = useAgentChatStore((s) => s.sessions);
const activeAgent = useAgentChatStore((s) => s.activeAgent);
const setActiveAgent = useAgentChatStore((s) => s.setActiveAgent);
const sendMessage = useAgentChatStore((s) => s.sendMessage);
const clearHistory = useAgentChatStore((s) => s.clearHistory);
const loading = useAgentChatStore((s) => s.loading);
const error = useAgentChatStore((s) => s.error);
const health = useAgentHealth();

const [input, setInput] = useState("");
const scrollRef = useRef<HTMLDivElement | null>(null);
const messages = sessions[activeAgent] ?? [];
const isLoading = loading[activeAgent];
const currentError = error[activeAgent];

const _agentKey = activeAgent;
const DEFAULT_SLOT: Record<AgentId, string> = {
drakon: "drakon-assistant-proxy",
architect: "architect-assistant-proxy",
docs: "docs-assistant-proxy",
};
const DEFAULT_MODEL: Record<AgentId, string> = {
drakon: DEFAULT_SLOT.drakon,
architect: "claude-3-haiku-20240307",
docs: "claude-3-haiku-20240307",
};
const savedProtocol =
typeof window !== "undefined"
? localStorage.getItem(${_agentKey}_llm_protocol)
: null;
const savedModel =
typeof window !== "undefined"
? localStorage.getItem(${_agentKey}_llm_model)
: null;
const llmProtocol = (savedProtocol || "openai") as "openai" | "anthropic";
const llmModel = savedModel || DEFAULT_MODEL[activeAgent];
const isConfigured = !!savedProtocol;
// Slot lookup: для обох протоколів — модель/слот резолвиться через worker proxy.
const slotName =
llmProtocol === "openai" ? llmModel : (savedModel || DEFAULT_SLOT[activeAgent]);
const { info: slotInfo, loading: slotLoading } = useSlotInfo(slotName);

useEffect(() => {
const el = scrollRef.current;
if (!el) return;
requestAnimationFrame(() => {
el.scrollTop = el.scrollHeight;
});
}, [messages.length, isLoading, activeAgent]);

const handleSend = () => {
const text = input.trim();
if (!text || isLoading) return;
setInput("");
void sendMessage(activeAgent, text);
};

const handleRetry = () => {
const lastUser = [...messages].reverse().find((m) => m.role === "user");
if (!lastUser) return;
void sendMessage(activeAgent, lastUser.content);
};

const handleOpenDiagram = async (
diag: { name: string; items: Record<string, unknown> },
): Promise<void> => {
const id = ${Date.now()}-${Math.random().toString(36).slice(2, 8)};
const drakonDiagram: DrakonDiagram = {
name: diag.name,
items: diag.items as DrakonDiagram["items"],
};

await api.saveDiagram(DEFAULT_FOLDER.slug, id, drakonDiagram);
navigate({ to: "/diagrams" });
};

return (
<div className={cn("flex h-full flex-col bg-background", className)}>
{/ Tabs /}
<div className="border-b px-3 pt-3">
<Tabs
value={activeAgent}
onValueChange={(v) => setActiveAgent(v as AgentId)}
>
<TabsList className="grid w-full grid-cols-3">
{AGENTS.map((id) => (
<TabsTrigger key={id} value={id} className="gap-2">
<span
className={cn(
"inline-block h-2 w-2 rounded-full",
health[id] ? "bg-emerald-500" : "bg-red-500",
)}
aria-hidden
/>
{getAgentLabel(id)}
</TabsTrigger>
))}
</TabsList>
</Tabs>
</div>

{/ Messages /}
<ScrollArea ref={scrollRef} className="flex-1">
<div className="flex flex-col gap-3 p-3">
{messages.length === 0 && (
<AssistantBubble text={WELCOME[activeAgent]} />
)}
{messages.map((m) => (
<MessageItem
key={m.id}
message={m}
onOpenDiagram={handleOpenDiagram}
/>
))}
{isLoading && <TypingDots />}
{currentError && (
<div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
<div className="flex-1">
<p className="font-medium">Помилка</p>
<p className="break-words opacity-90">{currentError}</p>
</div>
<Button size="sm" variant="outline" onClick={handleRetry}>
Повторити
</Button>
</div>
)}
</div>
</ScrollArea>

{/ LLM status bar — завжди показується /}
<div className="border-t px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 flex-wrap">
{!isConfigured && (
<span className="opacity-60 italic">за замовчуванням:</span>
)}
<span className="font-medium text-foreground/70">
{llmProtocol === "anthropic" ? "Anthropic" : "OpenAI"}
</span>
<span className="opacity-40">·</span>
<span className="font-mono" title={slot/model: ${llmModel}}>
{llmModel}
</span>
<span className="opacity-40">→</span>
{slotLoading ? (
<span className="opacity-50">…</span>
) : slotInfo?.active_model || slotInfo?.top_candidate ? (
<span
className="font-mono text-emerald-600 dark:text-emerald-400"
title={
slotInfo.active_model
? Active: ${slotInfo.active_model}
: Top candidate: ${slotInfo.top_candidate}
}
>
{(slotInfo.active_model || slotInfo.top_candidate || "")
.split("/")
.pop()}
</span>
) : llmProtocol === "anthropic" ? (
<span
className="font-mono text-emerald-600 dark:text-emerald-400"
title={Direct Anthropic model: ${llmModel}}
>
{llmModel}
</span>
):(
<span className="opacity-40 italic">модель невідома</span>
)}
</div>

{/ Composer /}
<div className="border-t p-3 space-y-2">
<div className="flex items-end gap-2">
<Textarea
value={input}
onChange={(e) => setInput(e.target.value)}
onKeyDown={(e) => {
if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
e.preventDefault();
handleSend();
}
}}
placeholder={
activeAgent === "drakon"
? "Вставте Python-функцію…"
: "Повідомлення… (Ctrl/Cmd+Enter — надіслати)"
}
className="min-h-[60px] flex-1 resize-none"
disabled={isLoading}
/>
<Button
size="icon"
onClick={handleSend}
disabled={isLoading || !input.trim()}
aria-label="Надіслати"
>
<Send className="h-4 w-4" />
</Button>
</div>
<div className="flex items-center justify-between">
<Badge variant="outline" className="gap-1 text-xs">
<Bot className="h-3 w-3" />
{getAgentLabel(activeAgent)}
</Badge>
<Button
size="sm"
variant="ghost"
onClick={() => clearHistory(activeAgent)}
disabled={messages.length === 0}
className="text-muted-foreground"
>
<Trash2 className="mr-1 h-3.5 w-3.5" />
Очистити
</Button>
</div>
</div>
</div>
);
}

function MessageItem({
message,
onOpenDiagram,
}: {
message: AgentMessage;
onOpenDiagram: (d: { name: string; items: Record<string, unknown> }) => void;
}) {
const [feedbackOpen, setFeedbackOpen] = useState(false);
const [feedbackText, setFeedbackText] = useState("");
const [correctedIr, setCorrectedIr] = useState("");
const [submitting, setSubmitting] = useState(false);

if (message.role === "user") {
return (
<div className="flex justify-end">
<div className="flex max-w-[85%] items-start gap-2">
<div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words">
{message.content}
</div>
<div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted">
<UserIcon className="h-3.5 w-3.5" />
</div>
</div>
</div>
);
}

const diagrams = message.metadata?.diagrams;
const hasDiagrams = !!diagrams && diagrams.length > 0;
const firstDiagram = hasDiagrams ? diagrams![0] : null;

const submitFeedback = async () => {
if (!firstDiagram) return;
if (!feedbackText.trim()) return;
setSubmitting(true);
try {
let parsed: Record<string, unknown> | undefined;
if (correctedIr.trim()) {
try {
parsed = JSON.parse(correctedIr);
} catch {
parsed = undefined;
}
}
await sendFeedback(message.agentId, firstDiagram.name, feedbackText, parsed);
setFeedbackOpen(false);
setFeedbackText("");
setCorrectedIr("");
} finally {
setSubmitting(false);
}
};

return (
<div className="flex justify-start">
<div className="flex max-w-[90%] items-start gap-2">
<div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted">
<Bot className="h-3.5 w-3.5" />
</div>
<div className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm">
<MarkdownLite text={message.content} />

{hasDiagrams && firstDiagram && (
<div className="mt-2 flex flex-wrap gap-2">
<Button
size="sm"
variant="secondary"
onClick={() => void onOpenDiagram(firstDiagram)}
>
<ExternalLink className="mr-1 h-3.5 w-3.5" />
Відкрити в редакторі
</Button>
<Button
size="sm"
variant="ghost"
onClick={() => setFeedbackOpen((v) => !v)}
>
<ThumbsDown className="mr-1 h-3.5 w-3.5" />
Зворотний зв&apos;язок
{feedbackOpen ? (
<ChevronUp className="ml-1 h-3 w-3" />
):(
<ChevronDown className="ml-1 h-3 w-3" />
)}
</Button>
</div>
)}

{feedbackOpen && firstDiagram && (
<div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
<div className="space-y-1">
<label className="text-xs font-medium text-muted-foreground">
Що було не так?
</label>
<Textarea
value={feedbackText}
onChange={(e) => setFeedbackText(e.target.value)}
placeholder="Опишіть проблему…"
className="min-h-[60px] text-sm"
/>
</div>
<div className="space-y-1">
<label className="text-xs font-medium text-muted-foreground">
Виправлений IR (JSON, опційно)
</label>
<Textarea
value={correctedIr}
onChange={(e) => setCorrectedIr(e.target.value)}
placeholder='{"items": {…}}'
className="min-h-[60px] font-mono text-xs"
/>
</div>
<Button
size="sm"
onClick={submitFeedback}
disabled={submitting || !feedbackText.trim()}
>
Надіслати фідбек
</Button>
</div>
)}
</div>
</div>
</div>
);
}

function AssistantBubble({ text }: { text: string }) {
return (
<div className="flex justify-start">
<div className="flex max-w-[90%] items-start gap-2">
<div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted">
<Bot className="h-3.5 w-3.5" />
</div>
<div className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
{text}
</div>
</div>
</div>
);
}

function TypingDots() {
const [elapsed, setElapsed] = useState(0);
useEffect(() => {
const id = setInterval(() => setElapsed((s) => s + 1), 1000);
return () => clearInterval(id);
}, []);
return (
<div className="flex justify-start">
<div className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2">
<div className="flex items-center gap-1">
<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
{elapsed > 0 && (
<span className="ml-2 text-xs text-muted-foreground tabular-nums">
{elapsed}с
</span>
)}
</div>
{elapsed >= 10 && (
<p className="text-xs text-muted-foreground">
Агент думає, LLM може тривати до 60с…
</p>
)}
</div>
</div>
);
}

function escHtml(s: string): string {
return s
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;"); }  function MarkdownLite({ text }: { text: string }) { const html = useMemo(() => { let t = text; t = t.replace( /`[\w]\n([\s\S]?)`/g, (_, c) => <pre class="my-2 overflow-x-auto rounded bg-muted px-3 py-2 text-xs
font-mono">${escHtml(c)}</pre>, ); t = t.replace(/\\([^]+)\\*/g, "<strong>$1</strong>"); t = t.replace(/\([^\n]+)\*/g, "<em>$1</em>"); const lines = t.split("\n"); const out: string[] = []; let listType = ""; const closeList = () => { if (listType) { out.push(</${listType}>); listType = ""; } }; for (const line of lines) { const h3 = line.match(/^### (.+)/); const h2 = line.match(/^## (.+)/); const h1 = line.match(/^# (.+)/); const ul = line.match(/^[-*] (.+)/); const ol = line.match(/^\d+\. (.+)/); if (h3) { closeList(); out.push(<h3 class="mt-3 mb-1 text-sm font-semibold">${h3[1]}</h3>); } else if (h2) { closeList(); out.push(<h2 class="mt-4 mb-1 text-sm font-bold">${h2[1]}</h2>); } else if (h1) { closeList(); out.push(<h1 class="mt-4 mb-1 text-base font-bold">${h1[1]}</h1>); } else if (ul) { if (listType !== "ul") { closeList(); out.push('<ul class="my-1 ml-4 list-disc space-y-0.5">'); listType = "ul"; } out.push(<li class="text-sm">${ul[1]}</li>); } else if (ol) { if (listType !== "ol") { closeList(); out.push('<ol class="my-1 ml-4 list-decimal space-y-0.5">'); listType = "ol"; } out.push(<li class="text-sm">${ol[1]}</li>); } else { closeList(); out.push(line === "" ? "<br />" : <p class="text-sm leading-relaxed">${line}</p>); } } closeList(); return out.join("\n"); }, [text]); return ( <div className="prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: html }} /> ); }  --- ### components/agents/KbDrawer.tsx **Розмір:** 4,535 байт   import { cn } from "@/lib/utils"; import type { KbFile } from "@/lib/agent-studio-data";  interface Props { open: boolean; kbFiles: KbFile[]; selectedFile: KbFile | null; onToggle: () => void; onSelectFile: (f: KbFile) => void; }  const SAMPLE_CONTENT: Record<string, string> = { "00-drakon-rules.md": `# DRAKON Topological Invariants  1. Shampoor (vertical spine) — main success path is always the leftmost vertical line. 2. No edge crossings — diagrams must be planar. 3. Single START, single END — every diagram has exactly one entry and one exit. 4. Decision branches go right — error / negative branches go to the right. 5. Loops use loop_start / loop_end pair with explicit body. `, "01-node-patterns.md": `# Python → DRAKON Node Mapping  Python                                            DRAKON  assignment                                        action  if / elif                                         decision  for/while                                         loop_start + loop_end  return                                            terminator  try/except                                        decision + action  `, "02-ir-format.md": `# DRAKON IR JSON schema  { "node_id": { "type": "action | decision | terminator | loop_start | loop_end", "text": "label", "next": "id", "yes": "id", "no": "id" } } `, };  export function KbDrawer({ open, kbFiles, selectedFile, onToggle, onSelectFile }: Props) { const content = selectedFile?.content ?? (selectedFile ? SAMPLE_CONTENT[selectedFile.filename] ?? "Перегляд недоступний." : "");  return ( <div className={cn( "shrink-0 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] transition-[height]
duration-200", open ? "h-[260px]" : "h-10" )} > <button onClick={onToggle} className="flex h-10 w-full items-center justify-between border-b
border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3
hover:bg-[var(--color-surface-container)]" > <div className="flex items-center gap-2"> <span className="material-symbols-outlined text-[18px]
text-[var(--color-primary-container)]"> database </span> <span className="font-headline-sm text-[var(--color-on-surface)]">БАЗА ЗНАНЬ</span> <span className="font-mono-label text-[var(--color-on-surface-variant)]"> {kbFiles.length} файлів </span> </div> <span className={cn( "material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]
transition-transform", open && "rotate-180" )} > expand_less </span> </button>  {open && ( <div className="flex h-[calc(100%-2.5rem)]"> <div className="w-[220px] shrink-0 overflow-y-auto border-r
border-[var(--color-outline-variant)]"> {kbFiles.map((f) => ( <button key={f.id} onClick={() => onSelectFile(f)} className={cn( "flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left transition-colors", selectedFile?.id === f.id ? "border-[var(--color-primary-container)] bg-[var(--color-surface-container-high)]" : "border-transparent hover:bg-[var(--color-surface-container-low)]" )} > <span className="font-mono-code text-[var(--color-on-surface)]">{f.filename}</span> <span className="font-ui-sm line-clamp-1 text-[var(--color-on-surface-variant)]"> {f.description} </span> </button> ))} {kbFiles.length === 0 && ( <div className="p-3 font-mono-label text-[var(--color-on-surface-variant)]"> Немає файлів для цього агента. </div> )} </div> <div className="flex-1 overflow-y-auto bg-[var(--color-surface-container-lowest)] p-4"> {selectedFile ? ( <pre className="font-mono-code whitespace-pre-wrap text-[var(--color-on-surface)]"> {content} </pre> ):( <p className="font-ui-sm text-[var(--color-on-surface-variant)]">
Оберіть файл для перегляду.
</p>
)}
</div>
</div>
)}
</div>
);
}


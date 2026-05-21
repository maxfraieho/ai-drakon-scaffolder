import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentId, AgentMessage } from "@/types/agent-chat";
import { sendToAgent } from "@/lib/agent-api";

function nextId(): string {
try {
if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
return crypto.randomUUID();
}
} catch {
// ignore
}
return  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface AgentChatState {
sessions: Record<AgentId, AgentMessage[]>;
activeAgent: AgentId;
loading: Record<AgentId, boolean>;
error: Record<AgentId, string | null>;
setActiveAgent: (id: AgentId) => void;
sendMessage: (
agentId: AgentId,
content: string,
context?: Record<string, unknown>,
) => Promise<void>;
clearHistory: (agentId: AgentId) => void;
}

export const useAgentChatStore = create<AgentChatState>()(
persist(
(set) => ({
sessions: { drakon: [], architect: [], docs: [] },
activeAgent: "drakon",
loading: { drakon: false, architect: false, docs: false },
error: { drakon: null, architect: null, docs: null },

setActiveAgent: (id) => set({ activeAgent: id }),

sendMessage: async (agentId, content, context) => {
const userMsg: AgentMessage = {
id: nextId(),
agentId,
role: "user",
content,
timestamp: new Date().toISOString(),
};
set((s) => ({
sessions: {
...s.sessions,
[agentId]: [...s.sessions[agentId], userMsg],
},
loading: { ...s.loading, [agentId]: true },
error: { ...s.error, [agentId]: null },
}));

try {
const result = await sendToAgent(agentId, content, context);
const assistantMsg: AgentMessage = {
id: nextId(),
agentId,
role: "assistant",
content: result.reply,
timestamp: new Date().toISOString(),
metadata: result.diagrams?.length
? { diagrams: result.diagrams }
: undefined,
};
set((s) => ({
sessions: {
...s.sessions,
[agentId]: [...s.sessions[agentId], assistantMsg],
},
}));
} catch (e) {
const raw = e instanceof Error ? e.message : String(e);
let friendly = raw;
if (
raw.includes("Failed to fetch") ||
raw.includes("NetworkError") ||
raw.includes("Load failed")
){
friendly =
"Не вдалося підключитися до агента. Перевірте мережу або спробуйте пізніше.";
} else if (raw.includes("400")) {
friendly =
"Агент повернув помилку (400). Спробуйте переформулювати повідомлення.";
} else if (raw.includes("502") || raw.includes("503")) {
friendly = "Агент тимчасово недоступний. Зачекайте хвилину та спробуйте.";
} else if (raw.includes("timeout") || raw.includes("AbortError")) {
friendly =
"Агент не відповів вчасно. LLM-запити можуть тривати до 60с — спробуйте ще раз.";
}
set((s) => ({
error: { ...s.error, [agentId]: friendly },
}));
} finally {
set((s) => ({ loading: { ...s.loading, [agentId]: false } }));
}
},

clearHistory: (agentId) =>
set((s) => ({ sessions: { ...s.sessions, [agentId]: [] } })),
}),
{
name: "agent_chat_history",
partialize: (s) => ({ sessions: s.sessions, activeAgent: s.activeAgent }),
},
),
);
---
### store/useDiagramStore.ts
**Розмір:** 6,926 байт


import { create } from "zustand";

import { api } from "@/lib/api";
import { convertDiagramToIr } from "@/lib/htse/diagram-to-ir";
import { validateIrRemote } from "@/lib/htse/ir-validator-client";
import { convertIrToDiagram } from "@/lib/htse/ir-to-diagram";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import type { Diagram, EditDelta, GenerateResult } from "@/types/drakon";
import type { MutationOp, MutationResult } from "@/types/mutations";
import type { ValidationIssue } from "@/lib/htse/ir-validator-client";

export type MutationLogEntry = {
timestamp: string;
op: string;
nodeId?: string;
status: "applied" | "rejected";
reason?: string;
};

interface DiagramStore {
currentDiagram: Diagram | null;
metrics: GenerateResult["metrics"] | null;
isDirty: boolean;
isSaving: boolean;

mutationQueue: MutationOp[];
isProcessingMutation: boolean;
mutationVersion: number;
lastMutationResult: MutationResult | null;
mutationLog: MutationLogEntry[];

setDiagram: (d: Diagram) => void;
setMetrics: (m: GenerateResult["metrics"] | null) => void;
applyDelta: (delta: EditDelta) => void;
saveDiagram: () => Promise<void>;
enqueueMutation: (op: MutationOp) => void;
processNextMutation: () => Promise<void>;
}

function getNodeId(op: MutationOp): string | undefined {
return "nodeId" in op ? op.nodeId : undefined;
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
currentDiagram: null,
metrics: null,
isDirty: false,
isSaving: false,
mutationQueue: [],
isProcessingMutation: false,
mutationVersion: 0,
lastMutationResult: null,
mutationLog: [],
setDiagram: (diagram) => set({ currentDiagram: diagram, isDirty: false }),

setMetrics: (metrics) => set({ metrics }),

// Legacy sync path — wraps as an enqueueMutation for backward compat
applyDelta: (delta) => {
const op = (
delta.type === "delete"
? { op: "deleteNode", nodeId: delta.itemId }
: delta.type === "insert"
?{
op: "insertNode",
nodeId: delta.itemId,
node: {
type: (delta.data as { type?: string })?.type ?? "action",
content: (delta.data as { content?: string })?.content ?? "",
...delta.data,
},
}
: { op: "updateNode", nodeId: delta.itemId, fields: delta.data ?? {} }
) as MutationOp;
get().enqueueMutation(op);
},

enqueueMutation: (op) => {
// Conflict check before queuing
const { mutationVersion, mutationQueue, isProcessingMutation } = get();
if ("expectedVersion" in op && op.expectedVersion !== undefined) {
if (op.expectedVersion !== mutationVersion) {
const entry: MutationLogEntry = {
timestamp: new Date().toISOString(),
op: op.op,
nodeId: getNodeId(op),
status: "rejected",
reason: "VERSION_CONFLICT",
};
set((s) => ({
mutationLog: [entry, ...s.mutationLog].slice(0, 10),
lastMutationResult: {
version: s.mutationVersion,
applied: [],
rejected: [{ op, reason: "VERSION_CONFLICT" }],
validationIssues: [],
},
}));
return;
}
}
set({ mutationQueue: [...mutationQueue, op] });
if (!isProcessingMutation) void get().processNextMutation();
},

processNextMutation: async () => {
const { mutationQueue, currentDiagram, mutationVersion } = get();
if (mutationQueue.length === 0 || !currentDiagram) {
set({ isProcessingMutation: false });
return;
}

set({ isProcessingMutation: true });
const [op, ...rest] = mutationQueue;
set({ mutationQueue: rest });

const nodeId = getNodeId(op);
const timestamp = new Date().toISOString();

try {
const ir = convertDiagramToIr(currentDiagram.diagram as never);

if (op.op === "insertNode") ir.items[op.nodeId] = op.node;
else if (op.op === "updateNode" && ir.items[op.nodeId])
ir.items[op.nodeId] = { ...ir.items[op.nodeId], ...op.fields };
else if (op.op === "deleteNode") delete ir.items[op.nodeId];
else if (op.op === "setOne" && ir.items[op.nodeId])
ir.items[op.nodeId].one = op.targetId ?? undefined;
else if (op.op === "setTwo" && ir.items[op.nodeId])
ir.items[op.nodeId].two = op.targetId ?? undefined;
else if (op.op === "renameDiagram") ir.name = op.newName;

const validation = await validateIrRemote(ir);

if (!validation.valid) {
const reason = (validation.issues as ValidationIssue[])[0]?.message ?? "Validation failed";
const entry: MutationLogEntry = { timestamp, op: op.op, nodeId, status: "rejected", reason };
set((s) => ({
isProcessingMutation: false,
mutationLog: [entry, ...s.mutationLog].slice(0, 10),
lastMutationResult: {
version: s.mutationVersion,
applied: [],
rejected: [{ op, reason }],
validationIssues: validation.issues as ValidationIssue[],
},
}));
} else {
const updatedWidgetDiagram = convertIrToDiagram(validation.normalizedIr ?? ir);
const entry: MutationLogEntry = { timestamp, op: op.op, nodeId, status: "applied" };
set((s) => {
const prev = s.currentDiagram!;
return {
currentDiagram: {
...prev,
updatedAt: timestamp,
diagram: {
...prev.diagram,
name: updatedWidgetDiagram.name,
items: updatedWidgetDiagram.items as typeof prev.diagram.items,
},
},
isDirty: true,
mutationVersion: mutationVersion + 1,
isProcessingMutation: false,
mutationLog: [entry, ...s.mutationLog].slice(0, 10),
lastMutationResult: {
version: mutationVersion + 1,
applied: [op],
rejected: [],
validationIssues: [],
},
};
});
}
} catch {
const entry: MutationLogEntry = {
timestamp,
op: op.op,
nodeId,
status: "rejected",
reason: "Processing error",
};
set((s) => ({
isProcessingMutation: false,
mutationLog: [entry, ...s.mutationLog].slice(0, 10),
}));
}

if (rest.length > 0) setTimeout(() => void get().processNextMutation(), 0);
},

saveDiagram: async () => {
const { currentDiagram } = get();
if (!currentDiagram) return;
set({ isSaving: true });
try {
await api.commit(currentDiagram.folderId, currentDiagram.id, currentDiagram);
upsertDiagramInStorage({ ...currentDiagram, updatedAt: new Date().toISOString() });
set({ isDirty: false });
} finally {
set({ isSaving: false });
}
},
}));


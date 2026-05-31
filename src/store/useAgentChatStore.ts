import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentId, AgentMessage } from "@/types/agent-chat";
import { sendToAgent } from "@/lib/agent-api";
import { generateId } from "@/lib/utils";

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
id: generateId(),
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
id: generateId(),
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
} else if (raw.includes("401") || raw.includes("403")) {
friendly = "Помилка авторизації агента (401/403). Перевірте PROXY_TOKEN у налаштуваннях сервера.";
} else if (raw.includes("500")) {
friendly = "Помилка конфігурації агента (500). Перевірте PROXY_TOKEN та PROXY_URL у .env на сервері.";
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


import { create } from "zustand";
import { persist } from "zustand/middleware";

import { sendToCliAgent } from "@/lib/agent-api";
import { generateId } from "@/lib/utils";
import { getCliAgentsConfig } from "@/lib/settings-storage";
import type { CliAgentId, CliMessage } from "@/types/agent-chat";

interface CliChatState {
  selectedAgent: CliAgentId;
  messages: CliMessage[];
  loading: boolean;
  error: string | null;
  setAgent: (id: CliAgentId) => void;
  sendMessage: (content: string, systemContext?: string) => Promise<void>;
  clearHistory: () => void;
}

export const useCliChatStore = create<CliChatState>()(
  persist(
    (set, get) => ({
      selectedAgent: "cli1",
      messages: [],
      loading: false,
      error: null,

      setAgent: (id) => set({ selectedAgent: id }),

      sendMessage: async (content, systemContext) => {
        const existingMessages = get().messages;
        const userMsg: CliMessage = {
          id: generateId(),
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };

        set({ messages: [...existingMessages, userMsg], loading: true, error: null });

        try {
          const cfg = getCliAgentsConfig();
          const { selectedAgent } = get();
          const agentCfg = cfg[selectedAgent];

          const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
          if (systemContext) {
            apiMessages.push({ role: "system", content: systemContext });
          }

          for (const m of [...existingMessages, userMsg]) {
            if (m.role === "user" || m.role === "assistant") {
              apiMessages.push({ role: m.role, content: m.content });
            }
          }

          const reply = await sendToCliAgent(agentCfg.url, apiMessages, agentCfg.apiKey || undefined);

          const assistantMsg: CliMessage = {
            id: generateId(),
            role: "assistant",
            content: reply,
            timestamp: new Date().toISOString(),
          };

          set((s) => ({ messages: [...s.messages, assistantMsg] }));
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e);
          let friendly = raw;
          if (raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("Load failed")) {
            friendly = "Не вдалося підключитися до CLI агента. Перевірте мережу або налаштування URL.";
          } else if (raw.includes("120") || raw.includes("timeout") || raw.includes("AbortError")) {
            friendly = "CLI агент не відповів за 120с. Спробуйте ще раз.";
          }
          set({ error: friendly });
        } finally {
          set({ loading: false });
        }
      },

      clearHistory: () => set({ messages: [], error: null }),
    }),
    {
      name: "cli_chat_history",
      partialize: (s) => ({ messages: s.messages, selectedAgent: s.selectedAgent }),
    },
  ),
);

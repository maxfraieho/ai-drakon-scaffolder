import { create } from "zustand";
import { persist } from "zustand/middleware";

import { sendToCliAgent } from "@/lib/agent-api";
import { generateId } from "@/lib/utils";
import { getCliAgentsConfig } from "@/lib/settings-storage";
import type { CliMessage } from "@/types/agent-chat";

interface CliChatState {
  selectedAgent: string;
  messages: CliMessage[];
  streamingId: string | null;
  streamingContent: string;
  loading: boolean;
  error: string | null;
  setAgent: (id: string) => void;
  sendMessage: (content: string, systemContext?: string) => Promise<void>;
  clearHistory: () => void;
}

export const useCliChatStore = create<CliChatState>()(
  persist(
    (set, get) => ({
      selectedAgent: "cli1",
      messages: [],
      streamingId: null,
      streamingContent: "",
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
        const assistantId = generateId();

        set({
          messages: [...existingMessages, userMsg],
          streamingId: assistantId,
          streamingContent: "",
          loading: true,
          error: null,
        });

        try {
          const agents = getCliAgentsConfig();
          const { selectedAgent } = get();
          const agentCfg = agents.find((a) => a.id === selectedAgent) ?? agents[0];
          if (!agentCfg) throw new Error("Немає налаштованих CLI агентів");

          const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
          if (systemContext) {
            apiMessages.push({ role: "system", content: systemContext });
          }

          for (const m of [...existingMessages, userMsg]) {
            if (m.role === "user" || m.role === "assistant") {
              apiMessages.push({ role: m.role, content: m.content });
            }
          }

          let accumulated = "";
          await sendToCliAgent(agentCfg.url, apiMessages, agentCfg.apiKey || undefined, (chunk) => {
            accumulated += chunk;
            set({ streamingContent: accumulated });
          });

          const assistantMsg: CliMessage = {
            id: assistantId,
            role: "assistant",
            content: accumulated,
            timestamp: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, assistantMsg],
            streamingId: null,
            streamingContent: "",
          }));
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e);
          let friendly = raw;
          if (raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("Load failed")) {
            friendly = "Не вдалося підключитися до CLI агента. Перевірте мережу або URL.";
          } else if (raw.includes("120") || raw.includes("timeout") || raw.includes("AbortError")) {
            friendly = "CLI агент не відповів за 120с. Спробуйте ще раз.";
          }
          set({ streamingId: null, streamingContent: "", error: friendly });
        } finally {
          set({ loading: false });
        }
      },

      clearHistory: () => set({ messages: [], streamingId: null, streamingContent: "", error: null }),
    }),
    {
      name: "cli_chat_history",
      partialize: (s) => ({
        messages: s.messages,
        selectedAgent: s.selectedAgent,
      }),
    },
  ),
);

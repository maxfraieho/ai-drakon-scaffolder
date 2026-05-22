# Промт 55: Mobile Layout Fix + CLI Agents Refactor + Streaming Fix

Комплексне виправлення: mobile layout для Pipelines та Diagrams, streaming без гальмування, динамічні CLI агенти.

---

## Проблеми для вирішення

1. **PipelinesPage mobile**: 3-колонний desktop layout показується на телефоні — все крихітне, чат недоступний
2. **PipelineChat streaming**: localStorage пишеться на кожен chunk → гальмо на ARM → текст "вистрибує" одразу
3. **CLI агенти**: тільки cli1/cli2 хардкод — немає add/remove у налаштуваннях
4. **DiagramsPage mobile**: лівий панель 50% ширини → файлів не видно

---

## Зміна 1: `src/types/settings.ts` (та `.lovable/src/types/settings.ts`)

**Замінити** `cliAgents` з фіксованої структури на масив:

```ts
export type CliAgentConfig = {
  id: string;
  url: string;
  label: string;
  apiKey: string;
};

export type AppSettings = {
  github: {
    owner: string;
    repo: string;
    branch: string;
    token: string;
  };
  n8n: {
    baseUrl: string;
    apiKey: string;
    webhookUrl: string;
    enabled: boolean;
  };
  app: {
    workerUrl: string;
    defaultFolder: string;
    theme: "light" | "dark" | "system";
  };
  minio: {
    endpoint: string;
    bucket: string;
    accessKey: string;
  };
  agents: {
    drakonUrl: string;
    architectUrl: string;
    docsUrl: string;
  };
  cliAgents: CliAgentConfig[];
};
```

---

## Зміна 2: `src/types/agent-chat.ts` (та `.lovable/src/types/agent-chat.ts`)

**Видалити** `CliAgentId` (більше не потрібен — тепер агент ідентифікується за `id: string`).
**Залишити** лише `CliMessage`:

```ts
export type AgentId = "drakon" | "architect" | "docs";

export interface AgentMessage {
  id: string;
  agentId: AgentId;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    diagrams?: Array<{ name: string; items: Record<string, unknown> }>;
    diagramId?: string;
    feedback?: string;
    correctedIr?: Record<string, unknown>;
  };
}

export interface AgentStatus {
  agentId: AgentId;
  online: boolean;
  url: string;
}

export interface CliMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

---

## Зміна 3: `src/lib/settings-storage.ts` (та `.lovable/src/lib/settings-storage.ts`)

**Оновити** DEFAULT_SETTINGS та readSettings для масиву:

```ts
// DEFAULT_SETTINGS.cliAgents:
cliAgents: [
  { id: "cli1", url: "https://claude.exodus.pp.ua", label: "RPi 3B", apiKey: "" },
  { id: "cli2", url: "https://claude2.exodus.pp.ua", label: "OrangePi", apiKey: "" },
],
```

У `readSettings()` замінити блок parsing `cliAgents`:

```ts
// Migration: стара структура {cli1, cli2} → масив
const rawCli = parsed.cliAgents;
let cliAgents: AppSettings["cliAgents"];
if (Array.isArray(rawCli)) {
  cliAgents = rawCli
    .filter((a): a is Record<string, unknown> => isObject(a))
    .map((a) => ({
      id: typeof a.id === "string" && a.id ? a.id : generateId(),
      url: typeof a.url === "string" && a.url ? a.url : "",
      label: typeof a.label === "string" ? a.label : "",
      apiKey: typeof a.apiKey === "string" ? a.apiKey : "",
    }));
  if (cliAgents.length === 0) cliAgents = DEFAULT_SETTINGS.cliAgents;
} else if (isObject(rawCli)) {
  // Migrate old {cli1, cli2} format
  const c1 = isObject((rawCli as Record<string, unknown>).cli1)
    ? (rawCli as Record<string, Record<string, unknown>>).cli1
    : {};
  const c2 = isObject((rawCli as Record<string, unknown>).cli2)
    ? (rawCli as Record<string, Record<string, unknown>>).cli2
    : {};
  cliAgents = [
    {
      id: "cli1",
      url: typeof c1.url === "string" && c1.url ? c1.url : DEFAULT_SETTINGS.cliAgents[0].url,
      label: typeof c1.label === "string" ? c1.label : DEFAULT_SETTINGS.cliAgents[0].label,
      apiKey: typeof c1.apiKey === "string" ? c1.apiKey : "",
    },
    {
      id: "cli2",
      url: typeof c2.url === "string" && c2.url ? c2.url : DEFAULT_SETTINGS.cliAgents[1].url,
      label: typeof c2.label === "string" ? c2.label : DEFAULT_SETTINGS.cliAgents[1].label,
      apiKey: typeof c2.apiKey === "string" ? c2.apiKey : "",
    },
  ];
} else {
  cliAgents = DEFAULT_SETTINGS.cliAgents;
}
```

**Оновити** helper:
```ts
export function getCliAgentsConfig(): AppSettings["cliAgents"] {
  return readSettings().cliAgents;
}
```

---

## Зміна 4: `src/store/useCliChatStore.ts` (та `.lovable/src/store/useCliChatStore.ts`)

**Повна заміна** — streaming без localStorage на кожен chunk, selectedAgent тепер `string`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { sendToCliAgent } from "@/lib/agent-api";
import { generateId } from "@/lib/utils";
import { getCliAgentsConfig } from "@/lib/settings-storage";
import type { CliMessage } from "@/types/agent-chat";

interface CliChatState {
  selectedAgent: string;           // agent id (e.g. "cli1", "cli2", or custom)
  messages: CliMessage[];          // persisted: completed messages only
  streamingId: string | null;      // NOT persisted — id of message being streamed
  streamingContent: string;        // NOT persisted — accumulating chunk buffer
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

        // Add user message + set streaming state (no localStorage write for assistant yet)
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
          await sendToCliAgent(
            agentCfg.url,
            apiMessages,
            agentCfg.apiKey || undefined,
            (chunk) => {
              accumulated += chunk;
              // Update only non-persisted streamingContent — NO localStorage write
              set({ streamingContent: accumulated });
            },
          );

          // Streaming done: write final message to persisted messages (ONE localStorage write)
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
      // Persisted: only completed messages + selectedAgent
      // streamingId, streamingContent, loading, error — NOT persisted
      partialize: (s) => ({
        messages: s.messages,
        selectedAgent: s.selectedAgent,
      }),
    },
  ),
);
```

---

## Зміна 5: `src/components/pipelines/PipelineChat.tsx` (та `.lovable/src/components/pipelines/PipelineChat.tsx`)

**Повна заміна** — відображати streamingContent як live-повідомлення, agents з масиву:

```tsx
import { useMemo, useRef, useEffect, useState } from "react";
import { AlertCircle, Bot, ChevronDown, Send, Trash2, User as UserIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCliChatStore } from "@/store/useCliChatStore";
import { getCliAgentsConfig } from "@/lib/settings-storage";
import type { IrDiagram } from "@/lib/graph-pipeline-api";

interface PipelineChatProps {
  pipelineName: string;
  ir: IrDiagram;
  className?: string;
  onBack?: () => void; // mobile: back to IR view
}

export function PipelineChat({ pipelineName, ir, className, onBack }: PipelineChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messages = useCliChatStore((s) => s.messages);
  const loading = useCliChatStore((s) => s.loading);
  const error = useCliChatStore((s) => s.error);
  const selectedAgent = useCliChatStore((s) => s.selectedAgent);
  const streamingId = useCliChatStore((s) => s.streamingId);
  const streamingContent = useCliChatStore((s) => s.streamingContent);
  const sendMessage = useCliChatStore((s) => s.sendMessage);
  const clearHistory = useCliChatStore((s) => s.clearHistory);
  const setAgent = useCliChatStore((s) => s.setAgent);

  const agents = useMemo(() => getCliAgentsConfig(), []);
  const selectedLabel = agents.find((a) => a.id === selectedAgent)?.label ?? selectedAgent;

  const systemContext = useMemo(
    () =>
      `You are analyzing a DRAKON pipeline named "${pipelineName}". Pipeline IR:\n\`\`\`json\n${JSON.stringify(ir, null, 2)}\n\`\`\``,
    [pipelineName, ir],
  );

  // Auto-scroll on new messages or streaming content update
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages.length, streamingContent]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void sendMessage(text, systemContext);
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onBack}>
              ← Назад
            </Button>
          )}
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Agent CLI
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Badge variant="outline" className="hidden h-5 text-[10px] sm:inline-flex">
            {pipelineName}
          </Badge>
          {agents.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 text-[10px]">
                  <span className="max-w-[80px] truncate">{selectedLabel}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {agents.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => setAgent(opt.id)}
                    className={cn("text-xs", selectedAgent === opt.id && "font-semibold")}
                  >
                    {opt.label || opt.id}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Messages — scrollable area */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 && !streamingId && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-muted/20 p-2 text-[11px] text-muted-foreground">
              Контекст pipeline IR додається автоматично до кожного запиту.
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "flex max-w-[92%] items-start gap-2 rounded-md px-2.5 py-2 text-xs",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-[var(--border-subtle)] bg-card text-foreground",
                )}
              >
                {m.role === "user" ? (
                  <UserIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Streaming live message */}
          {streamingId && (
            <div className="flex justify-start">
              <div className="flex max-w-[92%] items-start gap-2 rounded-md border border-[var(--border-subtle)] bg-card px-2.5 py-2 text-xs text-foreground">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="whitespace-pre-wrap break-words">
                  {streamingContent || (
                    <span className="inline-flex gap-0.5 text-muted-foreground">
                      <span className="animate-bounce [animation-delay:0ms]">·</span>
                      <span className="animate-bounce [animation-delay:150ms]">·</span>
                      <span className="animate-bounce [animation-delay:300ms]">·</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input — always visible sticky bottom */}
      <div className="shrink-0 space-y-2 border-t border-[var(--border-subtle)] p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Запит до ${selectedLabel}…`}
            className="min-h-[56px] max-h-32 resize-none text-xs"
            disabled={loading}
          />
          <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={clearHistory}
          disabled={messages.length === 0 && !streamingId}
          className="h-7 w-full justify-center text-[11px] text-muted-foreground"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Очистити чат
        </Button>
      </div>
    </div>
  );
}
```

---

## Зміна 6: `src/components/pipelines/PipelinesPage.tsx` (та `.lovable/src/components/pipelines/PipelinesPage.tsx`)

**Повна заміна** — mobile-first view state machine:

```tsx
import { useEffect, useState } from "react";
import {
  listPipelines,
  getPipeline,
  savePipeline,
  type PipelineInfo,
  type IrDiagram,
} from "@/lib/graph-pipeline-api";
import { PipelineDrakonView } from "./PipelineDrakonView";
import { PipelineChat } from "./PipelineChat";
import { ArrowLeft, Bot, PanelRightClose, PanelRightOpen, RefreshCw, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mobile navigation: list → ir → chat
type MobileView = "list" | "ir" | "chat";

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ir, setIr] = useState<IrDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);   // desktop toggle
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const refreshPipelines = () => {
    setListLoading(true);
    void listPipelines()
      .then(setPipelines)
      .catch(() => toast.error("Не вдалось завантажити пайплайни"))
      .finally(() => setListLoading(false));
  };

  useEffect(() => { refreshPipelines(); }, []);

  const handleSelect = async (name: string) => {
    setSelected(name);
    setLoading(true);
    setMobileView("ir"); // navigate to IR on mobile
    try {
      const data = await getPipeline(name);
      setIr(data);
    } catch {
      toast.error("Помилка завантаження пайплайну");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedIr: IrDiagram) => {
    if (!selected) return;
    await savePipeline(selected, updatedIr);
    setIr(updatedIr);
    toast.success("Пайплайн збережено");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)] md:flex-row">

      {/* ── LEFT PANEL: pipeline list ── */}
      {/* Mobile: full screen when mobileView=list; hidden otherwise */}
      {/* Desktop: always visible, 224px wide */}
      <div
        className={cn(
          "flex flex-col border-[var(--border-subtle)] bg-[var(--bg-base)]",
          // Mobile
          mobileView === "list" ? "flex h-full w-full" : "hidden",
          // Desktop override
          "md:flex md:h-full md:w-56 md:shrink-0 md:border-r",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent-amber)]">
            Пайплайни
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={refreshPipelines}
            title="Оновити"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", listLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!listLoading && pipelines.length === 0 && (
            <div className="rounded border border-[var(--border-subtle)] px-2.5 py-2 text-[11px] font-mono text-[var(--text-muted)]">
              Немає збережених пайплайнів.
            </div>
          )}
          {pipelines.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded font-mono text-[11px] transition-colors",
                selected === p.name
                  ? "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border border-[var(--accent-amber)]/30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
              )}
            >
              <Workflow className="inline h-3 w-3 mr-2 opacity-60" />
              {p.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden",
          // Mobile: show only when ir or chat
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {loading && (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)] font-mono text-xs">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Завантаження…
          </div>
        )}

        {!loading && !ir && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-[var(--text-muted)] font-mono text-sm">
            {/* Mobile back button */}
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 md:hidden"
              onClick={() => setMobileView("list")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              До списку
            </Button>
            <div>Обери пайплайн</div>
          </div>
        )}

        {!loading && ir && selected && (
          <div className="flex min-h-0 flex-1 overflow-hidden">

            {/* IR view — hidden on mobile when chat is open */}
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col overflow-hidden",
                mobileView === "chat" ? "hidden md:flex" : "flex",
              )}
            >
              {/* IR header bar */}
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
                {/* Mobile: back to list */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] md:hidden"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Список
                </Button>

                <div className="flex-1" />

                {/* CLI chat toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-[10px]"
                  onClick={() => {
                    // Mobile: navigate to chat view
                    // Desktop: toggle sidebar
                    if (window.innerWidth < 768) {
                      setMobileView("chat");
                    } else {
                      setChatOpen((v) => !v);
                    }
                  }}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Agent CLI</span>
                  {chatOpen ? (
                    <PanelRightClose className="hidden h-3.5 w-3.5 md:inline" />
                  ) : (
                    <PanelRightOpen className="hidden h-3.5 w-3.5 md:inline" />
                  )}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <PipelineDrakonView pipelineName={selected} ir={ir} onSave={handleSave} />
              </div>
            </div>

            {/* Chat panel */}
            {(chatOpen || mobileView === "chat") && (
              <aside
                className={cn(
                  "flex flex-col overflow-hidden border-[var(--border-subtle)]",
                  // Mobile: full screen
                  mobileView === "chat" ? "h-full w-full" : "hidden",
                  // Desktop: sidebar
                  "md:flex md:h-full md:w-80 md:shrink-0 md:border-l",
                )}
              >
                <PipelineChat
                  pipelineName={selected}
                  ir={ir}
                  className="h-full"
                  onBack={() => {
                    if (window.innerWidth < 768) {
                      setMobileView("ir");
                    } else {
                      setChatOpen(false);
                    }
                  }}
                />
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Зміна 7: `src/routes/settings.tsx` (та `.lovable/src/routes/settings.tsx`)

Замінити блок **Agent CLI** з фіксованих cli1/cli2 на динамічний список.

**Знайти** Card з заголовком "Agent CLI" і замінити весь вміст `<CardContent>`:

```tsx
{/* Agent CLI — dynamic list */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Agent CLI</CardTitle>
    <CardDescription className="text-xs">
      CLI-агенти для Pipeline Chat (OpenAI-compatible). Можна додавати будь-яку кількість.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    {settings.cliAgents.map((agent, idx) => (
      <div key={agent.id} className="rounded-md border border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground font-mono">{agent.label || agent.id}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
            onClick={() =>
              updateSettings((prev) => ({
                ...prev,
                cliAgents: prev.cliAgents.filter((_, i) => i !== idx),
              }))
            }
          >
            Видалити
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor={`cli-label-${idx}`} className="text-xs">Назва</Label>
            <Input
              id={`cli-label-${idx}`}
              value={agent.label}
              placeholder="RPi 3B"
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  cliAgents: prev.cliAgents.map((a, i) =>
                    i === idx ? { ...a, label: e.target.value } : a,
                  ),
                }))
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`cli-url-${idx}`} className="text-xs">URL</Label>
            <Input
              id={`cli-url-${idx}`}
              value={agent.url}
              placeholder="https://claude.exodus.pp.ua"
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  cliAgents: prev.cliAgents.map((a, i) =>
                    i === idx ? { ...a, url: e.target.value } : a,
                  ),
                }))
              }
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`cli-key-${idx}`} className="text-xs">API Key (optional)</Label>
          <Input
            id={`cli-key-${idx}`}
            type="password"
            value={agent.apiKey}
            placeholder="sk-..."
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                cliAgents: prev.cliAgents.map((a, i) =>
                  i === idx ? { ...a, apiKey: e.target.value } : a,
                ),
              }))
            }
          />
        </div>
      </div>
    ))}

    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full text-xs"
      onClick={() =>
        updateSettings((prev) => ({
          ...prev,
          cliAgents: [
            ...prev.cliAgents,
            { id: `cli${prev.cliAgents.length + 1}`, url: "", label: "", apiKey: "" },
          ],
        }))
      }
    >
      + Додати агент
    </Button>
  </CardContent>
</Card>
```

**Видалити** старі `showCli1Token`, `showCli2Token`, `handleSaveCliAgents` — більше не потрібні (auto-save через onChange).

---

## Зміна 8: `src/pages/DiagramsPage.tsx` (та `.lovable/src/pages/DiagramsPage.tsx`)

Додати mobile-friendly layout — на мобільному показувати або ліву панель, або редактор:

**Знайти** `<div className="flex h-full w-full overflow-hidden">` і замінити структуру:

```tsx
{/* Mobile tab toggle — visible only on mobile */}
<div className="flex shrink-0 border-b border-[var(--border-subtle)] md:hidden">
  <button
    className={cn(
      "flex-1 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors",
      !showEditor
        ? "border-b-2 border-[var(--accent-amber)] text-[var(--accent-amber)]"
        : "text-[var(--text-muted)]",
    )}
    onClick={() => setShowEditor(false)}
  >
    Файли
  </button>
  <button
    className={cn(
      "flex-1 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors",
      showEditor
        ? "border-b-2 border-[var(--accent-amber)] text-[var(--accent-amber)]"
        : "text-[var(--text-muted)]",
    )}
    onClick={() => setShowEditor(true)}
    disabled={!selectedDiagram}
  >
    Редактор
  </button>
</div>
```

Додати `const [showEditor, setShowEditor] = useState(false);` до стану компонента.

При виборі діаграми: `setSelectedDiagram(diagram); setShowEditor(true);`

До лівої панелі додати: `className={cn(..., showEditor ? "hidden md:flex" : "flex")}`
До правої панелі (редактор) додати: `className={cn(..., showEditor ? "flex" : "hidden md:flex")}`

---

## Checklist виконання

- [ ] `src/types/settings.ts` → `CliAgentConfig` тип + масив `cliAgents`
- [ ] `src/types/agent-chat.ts` → видалити `CliAgentId`, залишити `CliMessage`
- [ ] `src/lib/settings-storage.ts` → defaults масив + migration + helper
- [ ] `src/store/useCliChatStore.ts` → `streamingContent` + `streamingId`, один localStorage write
- [ ] `src/components/pipelines/PipelineChat.tsx` → `onBack` prop, live streaming bubble, agents від масиву
- [ ] `src/components/pipelines/PipelinesPage.tsx` → mobile view state machine
- [ ] `src/routes/settings.tsx` → динамічний список CLI агентів
- [ ] `src/pages/DiagramsPage.tsx` → mobile toggle файли/редактор
- [ ] ВСЕ дублюється в `.lovable/src/`

# Промт 53: Agent CLI Interface

Додати підтримку CLI-агентів (CodeProxy OpenAI-compatible) у Pipelines та панель налаштувань.

---

## Контекст

Є три LangGraph агенти (drakon :8765, architect :8766, docs :8767) через Cloudflare Worker.
Тепер додаємо новий тип агента — **Agent CLI** — це пряме підключення до Claude через CodeProxy
(OpenAI-compatible API `/v1/chat/completions`) на двох серверах:
- `cli1` → `https://claude.exodus.pp.ua` (RPi 3B)
- `cli2` → `https://claude2.exodus.pp.ua` (OrangePi PC2)

**Чат у Pipelines** перейменовуємо з "Claude" → **"Agent CLI"** та переключаємо його
з architect-агента на CLI-агенти, з dropdown для вибору сервера.

---

## Зміни — 6 файлів

> ⚠️ КРИТИЧНО: всі зміни вносити ОДНОЧАСНО в `src/` І `.lovable/src/` — обидві папки.

---

### 1. `src/types/agent-chat.ts` (та `.lovable/src/types/agent-chat.ts`)

Додати після існуючого коду:

```ts
export type CliAgentId = "cli1" | "cli2";

export interface CliMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

---

### 2. `src/types/settings.ts` (та `.lovable/src/types/settings.ts`)

У `AppSettings` додати поле `cliAgents`:

```ts
cliAgents: {
  cli1: { url: string; label: string; apiKey: string };
  cli2: { url: string; label: string; apiKey: string };
};
```

Повний тип після змін:

```ts
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
  cliAgents: {
    cli1: { url: string; label: string; apiKey: string };
    cli2: { url: string; label: string; apiKey: string };
  };
};
```

---

### 3. `src/lib/settings-storage.ts` (та `.lovable/src/lib/settings-storage.ts`)

**3а. Додати defaults:**

У `DEFAULT_SETTINGS` додати:

```ts
cliAgents: {
  cli1: { url: "https://claude.exodus.pp.ua", label: "RPi 3B", apiKey: "" },
  cli2: { url: "https://claude2.exodus.pp.ua", label: "OrangePi", apiKey: "" },
},
```

**3б. Додати parsing у `readSettings()`:**

Після `const agents = isObject(parsed.agents) ? parsed.agents : {};` додати:

```ts
const cliAgents = isObject(parsed.cliAgents) ? parsed.cliAgents : {};
const cli1 = isObject((cliAgents as Record<string, unknown>).cli1)
  ? (cliAgents as Record<string, Record<string, unknown>>).cli1
  : {};
const cli2 = isObject((cliAgents as Record<string, unknown>).cli2)
  ? (cliAgents as Record<string, Record<string, unknown>>).cli2
  : {};
```

У `return` блок додати:

```ts
cliAgents: {
  cli1: {
    url: typeof cli1.url === "string" && cli1.url ? cli1.url : DEFAULT_SETTINGS.cliAgents.cli1.url,
    label: typeof cli1.label === "string" ? cli1.label : DEFAULT_SETTINGS.cliAgents.cli1.label,
    apiKey: typeof cli1.apiKey === "string" ? cli1.apiKey : "",
  },
  cli2: {
    url: typeof cli2.url === "string" && cli2.url ? cli2.url : DEFAULT_SETTINGS.cliAgents.cli2.url,
    label: typeof cli2.label === "string" ? cli2.label : DEFAULT_SETTINGS.cliAgents.cli2.label,
    apiKey: typeof cli2.apiKey === "string" ? cli2.apiKey : "",
  },
},
```

**3в. Додати helper функцію** (після `getAgentsConfig`):

```ts
export function getCliAgentsConfig(): AppSettings["cliAgents"] {
  return readSettings().cliAgents;
}
```

---

### 4. `src/lib/agent-api.ts` (та `.lovable/src/lib/agent-api.ts`)

Додати нову функцію в кінець файлу:

```ts
export interface CliMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function sendToCliAgent(
  url: string,
  messages: CliMessage[],
  apiKey?: string,
): Promise<string> {
  const base = url.replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const resp = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "claude", messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`CLI Agent ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("CLI Agent: unexpected response format");
  return content;
}
```

---

### 5. `src/store/useCliChatStore.ts` (та `.lovable/src/store/useCliChatStore.ts`)

**Новий файл:**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CliAgentId, CliMessage } from "@/types/agent-chat";
import { sendToCliAgent } from "@/lib/agent-api";
import { getCliAgentsConfig } from "@/lib/settings-storage";

function nextId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
        const userMsg: CliMessage = {
          id: nextId(),
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, userMsg],
          loading: true,
          error: null,
        }));

        try {
          const cfg = getCliAgentsConfig();
          const { selectedAgent, messages } = get();
          const agentCfg = cfg[selectedAgent];

          const apiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
          if (systemContext) {
            apiMessages.push({ role: "system", content: systemContext });
          }
          // include all stored messages + new user message
          for (const m of [...messages, userMsg]) {
            if (m.role === "user" || m.role === "assistant") {
              apiMessages.push({ role: m.role, content: m.content });
            }
          }

          const reply = await sendToCliAgent(agentCfg.url, apiMessages, agentCfg.apiKey || undefined);

          const assistantMsg: CliMessage = {
            id: nextId(),
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
```

---

### 6. `src/components/pipelines/PipelineChat.tsx` (та `.lovable/src/components/pipelines/PipelineChat.tsx`)

**Повна заміна файлу:**

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
}

export function PipelineChat({ pipelineName, ir, className }: PipelineChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messages = useCliChatStore((s) => s.messages);
  const loading = useCliChatStore((s) => s.loading);
  const error = useCliChatStore((s) => s.error);
  const selectedAgent = useCliChatStore((s) => s.selectedAgent);
  const sendMessage = useCliChatStore((s) => s.sendMessage);
  const clearHistory = useCliChatStore((s) => s.clearHistory);
  const setAgent = useCliChatStore((s) => s.setAgent);

  const cliCfg = getCliAgentsConfig();
  const agentOptions = [
    { id: "cli1" as const, label: cliCfg.cli1.label || "RPi 3B" },
    { id: "cli2" as const, label: cliCfg.cli2.label || "OrangePi" },
  ];
  const selectedLabel = agentOptions.find((o) => o.id === selectedAgent)?.label ?? selectedAgent;

  const systemContext = useMemo(
    () =>
      `You are analyzing a DRAKON pipeline named "${pipelineName}". Pipeline IR:\n\`\`\`json\n${JSON.stringify(ir, null, 2)}\n\`\`\``,
    [pipelineName, ir],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages.length, loading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void sendMessage(text, systemContext);
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Agent CLI
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-5 text-[10px]">
            {pipelineName}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 gap-1 px-2 text-[10px]">
                {selectedLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {agentOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  onClick={() => setAgent(opt.id)}
                  className={cn("text-xs", selectedAgent === opt.id && "font-semibold")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 && (
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
                  <UserIcon className="mt-0.5 h-3.5 w-3.5" />
                ) : (
                  <Bot className="mt-0.5 h-3.5 w-3.5" />
                )}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-[11px] text-muted-foreground">{selectedLabel} відповідає…</div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t border-[var(--border-subtle)] p-3">
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
            className="min-h-[56px] resize-none text-xs"
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
          disabled={messages.length === 0}
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

## Налаштування у Settings

У файлі налаштувань (settings page) додати секцію **"Agent CLI"** поруч із секцією "Agents".
Для кожного з двох CLI агентів (cli1, cli2) — три поля:
- **URL** — endpoint сервера
- **Label** — назва для відображення у dropdown
- **API Key** — опціональний ключ (тип password, показати/сховати кнопкою)

Логіка збереження: через `updateSettings` з `settings-storage.ts`.

---

## Підсумок змін

| Файл | Тип |
|------|-----|
| `src/types/agent-chat.ts` | додати `CliAgentId`, `CliMessage` |
| `src/types/settings.ts` | додати `cliAgents` у `AppSettings` |
| `src/lib/settings-storage.ts` | defaults + parsing + `getCliAgentsConfig()` |
| `src/lib/agent-api.ts` | додати `sendToCliAgent()` |
| `src/store/useCliChatStore.ts` | НОВИЙ файл — Zustand store |
| `src/components/pipelines/PipelineChat.tsx` | повна заміна — Agent CLI + dropdown |
| Settings page | додати CLI agents секцію |

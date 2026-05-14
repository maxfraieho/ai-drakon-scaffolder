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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendFeedback, getAgentLabel } from "@/lib/agent-api";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import { DEFAULT_FOLDER } from "@/lib/folder-storage";
import { useAgentChatStore } from "@/store/useAgentChatStore";
import { useAgentHealth } from "@/hooks/useAgentHealth";
import type { AgentId, AgentMessage } from "@/types/agent-chat";
import type { Diagram, DrakonDiagram } from "@/types/drakon";

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
    fetch(`${workerUrl}/v1/proxy/slot-info?slot=${encodeURIComponent(slotName)}`)
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
  const llmProtocol =
    typeof window !== "undefined"
      ? localStorage.getItem(`${_agentKey}_llm_protocol`) ||
        localStorage.getItem("agent_llm_protocol") ||
        null
      : null;
  const llmModel =
    typeof window !== "undefined"
      ? localStorage.getItem(`${_agentKey}_llm_model`) ||
        localStorage.getItem("agent_llm_model") ||
        null
      : null;
  const isOpenAiProtocol = llmProtocol === "openai";
  const { info: slotInfo, loading: slotLoading } = useSlotInfo(
    isOpenAiProtocol ? llmModel : null,
  );

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

  const handleOpenDiagram = (
    diag: { name: string; items: Record<string, unknown> },
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const drakonDiagram = {
      name: diag.name,
      items: diag.items as DrakonDiagram["items"],
    } as DrakonDiagram;
    const diagram: Diagram = {
      id,
      name: diag.name,
      folderId: DEFAULT_FOLDER.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagram: drakonDiagram,
    };
    upsertDiagramInStorage(diagram);
    navigate({ to: "/diagrams" });
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Tabs */}
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
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
      </div>

      {/* LLM status bar */}
      {llmProtocol ? (
        <div className="border-t px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 flex-wrap">
          <span className="font-medium text-foreground/70">
            {llmProtocol === "anthropic" ? "Anthropic" : "OpenAI"}
          </span>
          {llmModel && (
            <>
              <span className="opacity-40">·</span>
              <span className="font-mono">{llmModel}</span>
            </>
          )}
          {isOpenAiProtocol && (
            <>
              <span className="opacity-40">→</span>
              {slotLoading ? (
                <span className="opacity-50">…</span>
              ) : slotInfo?.active_model || slotInfo?.top_candidate ? (
                <span
                  className="font-mono text-emerald-600 dark:text-emerald-400"
                  title={
                    slotInfo.active_model
                      ? `Active: ${slotInfo.active_model}`
                      : `Top candidate: ${slotInfo.top_candidate}`
                  }
                >
                  {(slotInfo.active_model || slotInfo.top_candidate || "")
                    .split("/")
                    .pop()}
                </span>
              ) : (
                <span className="opacity-40 italic">невідома</span>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Composer */}
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
                : "Повідомлення…  (Ctrl/Cmd+Enter — надіслати)"
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
                onClick={() => onOpenDiagram(firstDiagram)}
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
                ) : (
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
    .replace(/"/g, "&quot;");
}

function MarkdownLite({ text }: { text: string }) {
  const html = useMemo(() => {
    let t = text;
    t = t.replace(
      /```[\w]*\n([\s\S]*?)```/g,
      (_, c) =>
        `<pre class="my-2 overflow-x-auto rounded bg-muted px-3 py-2 text-xs font-mono">${escHtml(c)}</pre>`,
    );
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    const lines = t.split("\n");
    const out: string[] = [];
    let listType = "";
    const closeList = () => {
      if (listType) {
        out.push(`</${listType}>`);
        listType = "";
      }
    };
    for (const line of lines) {
      const h3 = line.match(/^### (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h1 = line.match(/^# (.+)/);
      const ul = line.match(/^[-*] (.+)/);
      const ol = line.match(/^\d+\. (.+)/);
      if (h3) {
        closeList();
        out.push(`<h3 class="mt-3 mb-1 text-sm font-semibold">${h3[1]}</h3>`);
      } else if (h2) {
        closeList();
        out.push(`<h2 class="mt-4 mb-1 text-sm font-bold">${h2[1]}</h2>`);
      } else if (h1) {
        closeList();
        out.push(`<h1 class="mt-4 mb-1 text-base font-bold">${h1[1]}</h1>`);
      } else if (ul) {
        if (listType !== "ul") {
          closeList();
          out.push('<ul class="my-1 ml-4 list-disc space-y-0.5">');
          listType = "ul";
        }
        out.push(`<li class="text-sm">${ul[1]}</li>`);
      } else if (ol) {
        if (listType !== "ol") {
          closeList();
          out.push('<ol class="my-1 ml-4 list-decimal space-y-0.5">');
          listType = "ol";
        }
        out.push(`<li class="text-sm">${ol[1]}</li>`);
      } else {
        closeList();
        out.push(line === "" ? "<br />" : `<p class="text-sm leading-relaxed">${line}</p>`);
      }
    }
    closeList();
    return out.join("\n");
  }, [text]);
  return (
    <div
      className="prose-sm max-w-none break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

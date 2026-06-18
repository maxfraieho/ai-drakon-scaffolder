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
  onBack?: () => void;
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, streamingContent]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void sendMessage(text, systemContext);
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onBack}>
              ← Назад
            </Button>
          )}
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Agent CLI</div>
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
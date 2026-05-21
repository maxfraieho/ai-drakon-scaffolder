import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bot, Send, Trash2, User as UserIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAgentChatStore } from "@/store/useAgentChatStore";
import type { IrDiagram } from "@/lib/graph-pipeline-api";

interface PipelineChatProps {
  pipelineName: string;
  ir: IrDiagram;
  className?: string;
}

export function PipelineChat({ pipelineName, ir, className }: PipelineChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sessions = useAgentChatStore((s) => s.sessions);
  const loading = useAgentChatStore((s) => s.loading);
  const error = useAgentChatStore((s) => s.error);
  const sendMessage = useAgentChatStore((s) => s.sendMessage);
  const clearHistory = useAgentChatStore((s) => s.clearHistory);

  const messages = sessions.architect ?? [];
  const isLoading = loading.architect;
  const currentError = error.architect;

  const context = useMemo(
    () => ({
      source: "pipelines",
      pipelineName,
      pipelineIr: ir,
    }),
    [pipelineName, ir],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage("architect", text, context);
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Claude
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">
          {pipelineName}
        </Badge>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-muted/20 p-2 text-[11px] text-muted-foreground">
              Контекст IR додається автоматично до кожного запиту.
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

          {isLoading && (
            <div className="text-[11px] text-muted-foreground">Claude відповідає…</div>
          )}

          {currentError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{currentError}</span>
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
            placeholder="Запит до Claude…"
            className="min-h-[56px] resize-none text-xs"
            disabled={isLoading}
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => clearHistory("architect")}
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
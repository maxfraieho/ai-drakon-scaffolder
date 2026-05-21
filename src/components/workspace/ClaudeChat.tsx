import { useState, useRef, useEffect } from "react";
import { Send, StopCircle, Paperclip, Trash2, SendToBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCodeProxy } from "@/hooks/useCodeProxy";

interface ClaudeChatProps {
  activeFileContent?: string;
  activeFileName?: string;
  activeDiagramJson?: string;
  activeDiagramName?: string;
  onSendToAgent?: (type: "architect" | "drakon", payload: string) => void;
  className?: string;
}

export function ClaudeChat({
  activeFileContent,
  activeFileName,
  activeDiagramJson,
  activeDiagramName,
  onSendToAgent,
  className,
}: ClaudeChatProps) {
  const { messages, sendMessage, isStreaming, stopStream, clearMessages } =
    useCodeProxy();
  const [input, setInput] = useState("");
  const [context, setContext] = useState<"none" | "file" | "diagram">("none");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    let payload = "";
    if (context === "file" && activeFileContent) {
      payload = `ФАЙЛ: ${activeFileName || "file"}\n\`\`\`\n${activeFileContent.slice(0, 8000)}\n\`\`\``;
    } else if (context === "diagram" && activeDiagramJson) {
      payload = `DRAKON IR: ${activeDiagramName || "diagram"}\n\`\`\`json\n${activeDiagramJson}\n\`\`\``;
    }
    sendMessage(input, payload || undefined);
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-[var(--bg-surface)] border-l border-[var(--border-subtle)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-amber)]">
          Claude Direct
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!activeFileContent}
            onClick={() => setContext((c) => (c === "file" ? "none" : "file"))}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors",
              context === "file"
                ? "border-[var(--accent-amber)]/60 text-[var(--accent-amber)] bg-[var(--accent-dim)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              !activeFileContent && "opacity-30 cursor-not-allowed",
            )}
          >
            <Paperclip className="h-2.5 w-2.5" /> FILE
          </button>
          <button
            type="button"
            disabled={!activeDiagramJson}
            onClick={() =>
              setContext((c) => (c === "diagram" ? "none" : "diagram"))
            }
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors",
              context === "diagram"
                ? "border-[var(--accent-amber)]/60 text-[var(--accent-amber)] bg-[var(--accent-dim)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              !activeDiagramJson && "opacity-30 cursor-not-allowed",
            )}
          >
            <Paperclip className="h-2.5 w-2.5" /> DRAKON
          </button>
          <button
            type="button"
            onClick={clearMessages}
            className="p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            title="Очистити чат"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] font-mono text-[11px] text-center">
            Почни розмову з Claude.
            <span className="text-[10px] opacity-60 mt-1 block">
              Прикріпи FILE або DRAKON для контексту.
            </span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "rounded px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap",
              msg.role === "user"
                ? "bg-[var(--bg-elevated)] border-l-2 border-[var(--accent-amber)]/60 text-[var(--text-primary)] ml-4"
                : "bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)] mr-4",
            )}
          >
            <span className="text-[9px] uppercase tracking-widest opacity-40 block mb-1.5">
              {msg.role === "user" ? "you" : "claude"}
            </span>
            {msg.content}
            {msg.role === "assistant" &&
              !isStreaming &&
              i === messages.length - 1 &&
              onSendToAgent &&
              msg.content && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => onSendToAgent("architect", msg.content)}
                    className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors uppercase tracking-wider"
                  >
                    <SendToBack className="h-3 w-3" /> → Architect
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendToAgent("drakon", msg.content)}
                    className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors uppercase tracking-wider"
                  >
                    <SendToBack className="h-3 w-3" /> → DRAKON
                  </button>
                </div>
              )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Запитай Claude…"
          rows={2}
          className="flex-1 resize-none bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-[11px] focus-visible:ring-[var(--accent-amber)]/50 min-h-0"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={stopStream}
            className="self-end h-8 w-8 shrink-0"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            className="self-end h-8 w-8 shrink-0 bg-[var(--accent-amber)] text-black hover:brightness-110"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

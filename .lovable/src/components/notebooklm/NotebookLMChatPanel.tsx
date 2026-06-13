import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Send,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
  Sparkles,
  Brain,
  MessageSquare
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: { title: string; url: string }[];
}

export function NotebookLMChatPanel() {
  const [notebookId, setNotebookId] = useState(() => {
    try { return localStorage.getItem("notebooklm_id") || ""; } catch { return ""; }
  });
  const [kind, setKind] = useState<"answer" | "summary" | "study_guide" | "flashcards">("answer");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: notebooksData } = useQuery({
    queryKey: ["notebooklmNotebooks"],
    queryFn: () => api.listNotebooks(),
    staleTime: 60_000,
  });
  const notebooks = notebooksData?.notebooks ?? [];

  // Save notebookUrl to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem("notebooklm_id", notebookId);
    } catch (e) {
      // Ignore storage errors
    }
  }, [notebookId]);

  // Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

    const handleAsk = async (questionText: string, isInitial: boolean) => {
    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      toast.error("Please enter a question.");
      return;
    }

    if (!notebookId.trim()) {
      toast.error("Please select a notebook.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const newMessages: Message[] = [...messages, { role: "user", content: trimmedQuestion }];
    setMessages(newMessages);
    
    if (isInitial) {
      setInitialQuestion("");
    } else {
      setFollowUpQuestion("");
    }

    try {
      // Create request payload matching api contract

      const response = await api.notebooklmChat({
        notebookId,
        question: trimmedQuestion,
      });

      if (response.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.answer,
            citations: response.citations,
          },
        ]);
      } else {
        const errorMsg = response.message || response.error || "Failed to get answer from Archivist.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "An unexpected error occurred.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    toast.success("Chat history cleared.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
      {/* LEFT PANEL: CONFIGURATION */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-[var(--accent-amber)] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Chat Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Notebook Select */}
            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                Select Notebook
              </Label>
              <Select value={notebookId} onValueChange={setNotebookId}>
                <SelectTrigger className="w-full h-8 font-mono text-[11px] rounded-sm border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <SelectValue placeholder="Choose a notebook..." />
                </SelectTrigger>
                <SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-overlay)]">
                  {notebooks.length === 0 && (
                    <SelectItem value="_none" disabled className="font-mono text-[11px] text-[var(--text-muted)]">
                      No notebooks found
                    </SelectItem>
                  )}
                  {notebooks.map((nb) => (
                    <SelectItem key={nb.id} value={nb.id} className="font-mono text-[11px]">
                      {nb.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kind Select */}
            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                Generation Mode
              </Label>
              <Select value={kind} onValueChange={(value) => setKind(value as any)}>
                <SelectTrigger className="w-full h-8 font-mono text-[11px] rounded-sm border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-overlay)]">
                  <SelectItem value="answer" className="font-mono text-[11px]">Answer (General Q&A)</SelectItem>
                  <SelectItem value="summary" className="font-mono text-[11px]">Summary (Key points)</SelectItem>
                  <SelectItem value="study_guide" className="font-mono text-[11px]">Study Guide</SelectItem>
                  <SelectItem value="flashcards" className="font-mono text-[11px]">Flashcards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Textarea for Initial Question */}
            <div className="space-y-2">
              <Label htmlFor="initial-prompt" className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                Ask a Question
              </Label>
              <Textarea
                id="initial-prompt"
                placeholder="What would you like to ask or generate from this notebook?"
                value={initialQuestion}
                onChange={(e) => setInitialQuestion(e.target.value)}
                className="w-full h-24 font-mono text-[11px] rounded-sm border-[var(--border-subtle)] bg-[var(--bg-elevated)] focus:border-[var(--accent-amber)] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(initialQuestion, true);
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleAsk(initialQuestion, true)}
                disabled={isLoading || !notebookId.trim() || !initialQuestion.trim()}
                className="flex-1 rounded-sm bg-[var(--accent-amber)] hover:brightness-110 active:scale-[0.98] transition-transform text-black font-mono text-[11px] uppercase tracking-wider font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    Thinking
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1.5" />
                    Ask Archivist
                  </>
                )}
              </Button>

              {messages.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearChat}
                  className="rounded-sm border-[var(--border-subtle)] hover:bg-white/5 font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT PANEL: CHAT WINDOW */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-0 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-md">
        {/* Top Status Bar */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--accent-amber)]" />
            <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              Archivist Session
            </span>
          </div>
          {notebookId && notebooks.find(n => n.id === notebookId) && (
            <span className="font-mono text-[10px] text-[var(--text-secondary)]">
              {notebooks.find(n => n.id === notebookId)?.title}
            </span>
          )}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error communicating with Gateway</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="h-12 w-12 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-amber)]/20 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-[var(--accent-amber)]" />
              </div>
              <h3 className="font-mono text-[13px] font-semibold text-[var(--text-primary)] mb-1">
                Semantically Query Your Project
              </h3>
              <p className="font-mono text-[11px] text-[var(--text-secondary)] max-w-sm">
                Enter your Archivist ID, type your question in the left panel, and click Ask. 
                The RAG engine will synthesize answers based on your vector-indexed documents.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-md p-3.5 ${
                      m.role === "user"
                        ? "bg-[var(--accent-dim)] text-[var(--text-primary)] border border-[var(--accent-amber)]/20"
                        : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    }`}
                  >
                    {/* Role Tag */}
                    <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      {m.role === "user" ? "You" : "Archivist"}
                    </div>

                    {/* Content */}
                    <div className="prose prose-sm prose-invert min-w-0 max-w-full overflow-x-hidden break-words [overflow-wrap:anywhere] [&_*]:min-w-0 [&_*]:max-w-full [&_a]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:[overflow-wrap:anywhere] [&_code]:[word-break:break-word] [&_pre]:overflow-x-hidden [&_pre]:whitespace-pre-wrap [&_pre_code]:whitespace-pre-wrap [&_pre_code]:break-words [&_pre_code]:[overflow-wrap:anywhere] [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto text-[12px] font-mono leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noreferrer noopener" className="text-[var(--accent-amber)] hover:underline">
                              {children}
                            </a>
                          ),
                          pre: ({ children }) => (
                            <pre className="max-w-full overflow-x-hidden whitespace-pre-wrap break-words rounded bg-black/40 p-2.5 text-[10px] my-2">
                              {children}
                            </pre>
                          ),
                          code: ({ children, className }) => (
                            <code className={`${className ?? ""} max-w-full bg-black/30 rounded px-1 py-0.5 text-[11px]`}>
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citations block */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 border-t border-[var(--border-subtle)] pt-2">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                          Sources & Citations:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((cite, cIdx) => (
                            <a
                              key={cIdx}
                              href={cite.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 border border-[var(--border-subtle)] hover:border-[var(--accent-amber)] hover:bg-[var(--accent-dim)] text-[var(--accent-amber)] transition-all font-mono text-[10px] max-w-xs"
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate">{cite.title}</span>
                              <ExternalLink className="h-2 w-2 shrink-0 opacity-70" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="max-w-[85%] rounded-md p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Archivist
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-amber)]" />
                  Generating answer using indexed workspace context...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Message Input Box for continuous chat */}
        {messages.length > 0 && (
          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 flex items-center gap-2">
            <Input
              placeholder="Ask a follow-up question..."
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              className="flex-1 font-mono text-[11px] rounded-sm border-[var(--border-subtle)] bg-[var(--bg-elevated)] focus:border-[var(--accent-amber)] h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(followUpQuestion, false);
                }
              }}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => handleAsk(followUpQuestion, false)}
              disabled={isLoading || !followUpQuestion.trim()}
              className="h-9 w-9 bg-[var(--accent-amber)] hover:brightness-110 active:scale-[0.95] text-black shrink-0"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AgentKind, extractAgentText, mcpCall } from "@/lib/mcp-client";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  agent: AgentKind;
};

const AGENT_LABELS: Record<AgentKind, string> = {
  drakon: "drakon-agent",
  architect: "architect-agent",
  docs: "docs-agent",
};

export function AgentChatPanel() {
  const [agent, setAgent] = useState<AgentKind>("drakon");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
      agent,
    };

    setError(null);
    setIsLoading(true);
    setInput("");
    setMessages((prev) => [...prev, userMessage]);

    try {
      const payload = await mcpCall(agent, trimmed);
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: extractAgentText(payload),
        agent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Request failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[78vh] min-h-[560px] border-border/70">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Chat Panel</CardTitle>
            <CardDescription>Send prompts to any local agent endpoint.</CardDescription>
          </div>
          <Badge variant="secondary">{AGENT_LABELS[agent]}</Badge>
        </div>

        <Tabs value={agent} onValueChange={(value) => setAgent(value as AgentKind)}>
          <TabsList>
            <TabsTrigger value="drakon">DRAKON</TabsTrigger>
            <TabsTrigger value="architect">Architect</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex h-[calc(100%-132px)] flex-col gap-4">
        <ScrollArea className="h-full rounded-md border border-border/70 bg-muted/20">
          <div ref={viewportRef} className="space-y-3 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Start by pasting Python code or asking an architecture/docs question.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-md border border-border/80 bg-card px-3 py-2 text-sm"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={message.role === "user" ? "default" : "outline"}>
                      {message.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{AGENT_LABELS[message.agent]}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-foreground">
                    {message.text}
                  </pre>
                </div>
              ))
            )}

            {isLoading ? <p className="text-sm text-muted-foreground">Thinking…</p> : null}
          </div>
        </ScrollArea>

        <form className="space-y-2" onSubmit={onSubmit}>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              agent === "drakon"
                ? "Paste Python function to convert into DRAKON IR..."
                : "Type your message..."
            }
            rows={4}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Endpoint: {AGENT_LABELS[agent]} ({agent === "drakon" ? "/analyze" : "/chat"})
            </p>
            <Button type="submit" disabled={!canSend}>
              Send
            </Button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
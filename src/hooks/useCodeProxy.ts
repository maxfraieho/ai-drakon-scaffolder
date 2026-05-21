import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const ENDPOINTS = [
  "https://claude.exodus.pp.ua/v1/chat/completions",
  "https://claude2.exodus.pp.ua/v1/chat/completions",
];

export function useCodeProxy() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, contextPayload?: string) => {
      const slotKey = localStorage.getItem("claude_slot_key") || "";
      if (!slotKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "⚠ Вкажіть Claude slot key в Налаштуваннях (поле \"Claude Slot Key\").",
          },
        ]);
        return;
      }

      const fullContent = contextPayload
        ? `${contextPayload}\n\n---\n\n${content}`
        : content;
      const newMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: fullContent },
      ];
      setMessages(newMessages);
      setIsStreaming(true);
      abortRef.current = new AbortController();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      for (const endpoint of ENDPOINTS) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${slotKey}`,
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              messages: newMessages,
              stream: true,
            }),
            signal: abortRef.current.signal,
          });

          if (!res.ok) {
            if (res.status === 429 || res.status === 401) continue;
            throw new Error(`HTTP ${res.status}`);
          }
          if (!res.body) throw new Error("No ReadableStream");

          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buf = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ") || line === "data: [DONE]")
                continue;
              try {
                const data = JSON.parse(line.slice(6));
                const chunk = data.choices?.[0]?.delta?.content || "";
                if (chunk) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: updated[updated.length - 1].content + chunk,
                    };
                    return updated;
                  });
                }
              } catch {
                /* malformed chunk */
              }
            }
          }
          break;
        } catch (err: any) {
          if (err.name === "AbortError") break;
        }
      }
      setIsStreaming(false);
    },
    [messages],
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    sendMessage,
    isStreaming,
    stopStream,
    clearMessages,
    setMessages,
  };
}

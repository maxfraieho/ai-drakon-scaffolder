# Lovable Prompt 46 — Claude Direct Chat via CodeProxy (50-point account)

## Мета
Додати прямий чат з Claude через CodeProxy endpoints, з context picker (файл або DRAKON схема) та кнопками "відправити агенту".

## Крок 1: Створити `src/hooks/useCodeProxy.ts`

```ts
import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ENDPOINTS = [
  'https://claude.exodus.pp.ua/v1/chat/completions',
  'https://claude2.exodus.pp.ua/v1/chat/completions',
];

export function useCodeProxy() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, contextPayload?: string) => {
    const slotKey = localStorage.getItem('claude_slot_key') || '';
    if (!slotKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠ Вкажіть Claude slot key в Налаштуваннях (поле "Claude Slot Key").',
      }]);
      return;
    }

    const fullContent = contextPayload ? `${contextPayload}\n\n---\n\n${content}` : content;
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: fullContent }];
    setMessages(newMessages);
    setIsStreaming(true);
    abortRef.current = new AbortController();
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${slotKey}` },
          body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: newMessages, stream: true }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          if (res.status === 429 || res.status === 401) continue;
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.body) throw new Error('No ReadableStream');

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const data = JSON.parse(line.slice(6));
              const chunk = data.choices?.[0]?.delta?.content || '';
              if (chunk) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: updated[updated.length - 1].content + chunk,
                  };
                  return updated;
                });
              }
            } catch { /* malformed chunk */ }
          }
        }
        break;
      } catch (err: any) {
        if (err.name === 'AbortError') break;
      }
    }
    setIsStreaming(false);
  }, [messages]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, sendMessage, isStreaming, stopStream, clearMessages, setMessages };
}
```

## Крок 2: Створити `src/components/workspace/ClaudeChat.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Paperclip, Trash2, SendToBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCodeProxy } from '@/hooks/useCodeProxy';
import { api } from '@/lib/api';

interface ClaudeChatProps {
  activeFileContent?: string;
  activeFileName?: string;
  activeDiagramJson?: string;
  activeDiagramName?: string;
  onSendToAgent?: (type: 'architect' | 'drakon', payload: string) => void;
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
  const { messages, sendMessage, isStreaming, stopStream, clearMessages } = useCodeProxy();
  const [input, setInput] = useState('');
  const [context, setContext] = useState<'none' | 'file' | 'diagram'>('none');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    let payload = '';
    if (context === 'file' && activeFileContent) {
      payload = `ФАЙЛ: ${activeFileName || 'file'}\n\`\`\`\n${activeFileContent.slice(0, 8000)}\n\`\`\``;
    } else if (context === 'diagram' && activeDiagramJson) {
      payload = `DRAKON IR: ${activeDiagramName || 'diagram'}\n\`\`\`json\n${activeDiagramJson}\n\`\`\``;
    }
    sendMessage(input, payload || undefined);
    setInput('');
  };

  const handleDispatch = async (type: 'architect' | 'drakon', content: string) => {
    onSendToAgent?.(type, content);
    try {
      await api.agentChat(type === 'architect' ? 'architect' : 'drakon', content);
    } catch { /* handled by caller */ }
  };

  return (
    <div className={cn("flex flex-col bg-[var(--bg-surface)] border-l border-[var(--border-subtle)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-amber)]">
          Claude Direct
        </span>
        <div className="flex items-center gap-1">
          {/* Context toggles */}
          <button
            type="button"
            disabled={!activeFileContent}
            onClick={() => setContext(c => c === 'file' ? 'none' : 'file')}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors",
              context === 'file'
                ? "border-[var(--accent-amber)]/60 text-[var(--accent-amber)] bg-[var(--accent-dim)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              !activeFileContent && "opacity-30 cursor-not-allowed"
            )}
          >
            <Paperclip className="h-2.5 w-2.5" /> FILE
          </button>
          <button
            type="button"
            disabled={!activeDiagramJson}
            onClick={() => setContext(c => c === 'diagram' ? 'none' : 'diagram')}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors",
              context === 'diagram'
                ? "border-[var(--accent-amber)]/60 text-[var(--accent-amber)] bg-[var(--accent-dim)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              !activeDiagramJson && "opacity-30 cursor-not-allowed"
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
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] font-mono text-[11px] text-center">
            Почни розмову з Claude.<br />
            <span className="text-[10px] opacity-60 mt-1 block">Прикріпи FILE або DRAKON для контексту.</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "rounded-[var(--radius-sm)] px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap",
              msg.role === 'user'
                ? "bg-[var(--bg-elevated)] border-l-2 border-[var(--accent-amber)]/60 text-[var(--text-primary)] ml-4"
                : "bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)] mr-4"
            )}
          >
            <span className="text-[9px] uppercase tracking-widest opacity-40 block mb-1.5">
              {msg.role === 'user' ? 'you' : 'claude'}
            </span>
            {msg.content}
            {msg.role === 'assistant' && !isStreaming && i === messages.length - 1 && onSendToAgent && msg.content && (
              <div className="flex gap-2 mt-3 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => handleDispatch('architect', msg.content)}
                  className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] hover:text-[var(--accent-amber)] transition-colors uppercase tracking-wider"
                >
                  <SendToBack className="h-3 w-3" /> → Architect
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatch('drakon', msg.content)}
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
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Запитай Claude…"
          rows={2}
          className="flex-1 resize-none bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-[11px] focus-visible:ring-[var(--accent-amber)]/50 min-h-0"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button variant="destructive" size="icon" onClick={stopStream} className="self-end h-8 w-8 shrink-0">
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
```

## Крок 3: Додати поле `claude_slot_key` в `src/pages/SettingsPage.tsx`

В секцію агентів або окрему секцію "Claude Direct" додай поле:
```tsx
<Label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Claude Slot Key</Label>
<Input
  type="password"
  defaultValue={localStorage.getItem('claude_slot_key') || ''}
  onChange={e => localStorage.setItem('claude_slot_key', e.target.value)}
  placeholder="sk-ant-..."
  className="font-mono text-[11px]"
/>
<p className="text-[10px] text-[var(--text-muted)]">
  Bearer token для claude.exodus.pp.ua та claude2.exodus.pp.ua
</p>
```

## Крок 4: Показати `ClaudeChat` на вкладці `/agents`

В `src/routes/agents.tsx` або в `AgentChatPanel` додай вкладку "Claude Direct":
- Таб "Агенти" — існуючий AgentChatPanel
- Таб "Claude" — `<ClaudeChat className="h-full w-full" />`

## Важливо
- Не видаляти і не змінювати існуючий `AgentChatPanel`
- `api.agentChat` — якщо функції немає, просто видали виклик, залиш тільки `onSendToAgent?.(type, content)`
- Textarea з `shadcn/ui` якщо є, або `<textarea>` якщо ні

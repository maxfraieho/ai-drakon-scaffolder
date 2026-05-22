# Промт 54: Agent CLI — SSE Streaming

Додати SSE streaming у чат Pipeline Agent CLI.
Зараз чат чекає повну відповідь (~30-60с мовчки). Після цього промту текст з'являється поступово.

---

## Контекст

`sendToCliAgent` у `src/lib/agent-api.ts` надсилає `stream: false`.
CodeProxy підтримує SSE streaming (`stream: true`).
`useCliChatStore` у `src/store/useCliChatStore.ts` зберігає повідомлення.

---

## Зміни — 3 файли

> ⚠️ КРИТИЧНО: всі зміни вносити ОДНОЧАСНО в `src/` І `.lovable/src/`

---

### 1. `src/lib/agent-api.ts` (та `.lovable/src/lib/agent-api.ts`)

**Замінити** функцію `sendToCliAgent` повністю:

```ts
export async function sendToCliAgent(
  url: string,
  messages: CliApiMessage[],
  apiKey?: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const base = url.replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const useStream = typeof onChunk === "function";

  const resp = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "cli-cc/claude-sonnet-4-6",
      messages,
      stream: useStream,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`CLI Agent ${resp.status}: ${text}`);
  }

  if (!useStream) {
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("CLI Agent: unexpected response format");
    return content;
  }

  // SSE streaming
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("CLI Agent: no response body");

  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const chunk = json.choices?.[0]?.delta?.content;
        if (typeof chunk === "string" && chunk) {
          full += chunk;
          onChunk(chunk);
        }
      } catch { /* ignore malformed SSE chunks */ }
    }
  }

  return full;
}
```

---

### 2. `src/store/useCliChatStore.ts` (та `.lovable/src/store/useCliChatStore.ts`)

**Замінити** метод `sendMessage` — додати streaming з progressive update:

```ts
sendMessage: async (content, systemContext) => {
  const existingMessages = get().messages;
  const userMsg: CliMessage = {
    id: generateId(),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };

  set({ messages: [...existingMessages, userMsg], loading: true, error: null });

  // Placeholder assistant message — оновлюватиметься по чанках
  const assistantId = generateId();
  const assistantMsg: CliMessage = {
    id: assistantId,
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
  };
  set((s) => ({ messages: [...s.messages, assistantMsg] }));

  try {
    const cfg = getCliAgentsConfig();
    const { selectedAgent } = get();
    const agentCfg = cfg[selectedAgent];

    const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    if (systemContext) {
      apiMessages.push({ role: "system", content: systemContext });
    }
    for (const m of [...existingMessages, userMsg]) {
      if (m.role === "user" || m.role === "assistant") {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }

    await sendToCliAgent(
      agentCfg.url,
      apiMessages,
      agentCfg.apiKey || undefined,
      (chunk) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        }));
      },
    );
  } catch (e) {
    // Видалити порожній placeholder якщо помилка
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== assistantId),
    }));

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
```

---

### 3. `src/components/pipelines/PipelineChat.tsx` (та `.lovable/src/components/pipelines/PipelineChat.tsx`)

Замінити текст індикатора завантаження — показувати що відбувається:

**Знайти:**
```tsx
{loading && (
  <div className="text-[11px] text-muted-foreground">{selectedLabel} відповідає…</div>
)}
```

**Замінити на:**
```tsx
{loading && (
  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
    <span className="inline-flex gap-0.5">
      <span className="animate-bounce [animation-delay:0ms]">·</span>
      <span className="animate-bounce [animation-delay:150ms]">·</span>
      <span className="animate-bounce [animation-delay:300ms]">·</span>
    </span>
    {selectedLabel} генерує…
  </div>
)}
```

---

## Результат

- Текст з'являється по словах/реченнях, не після повного очікування
- `loading: true` залишається доки stream не закінчиться
- Порожній placeholder видаляється при помилці
- Fallback до non-streaming якщо `onChunk` не передано (зворотна сумісність)

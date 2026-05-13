# Промт 12 — AgentChat UX: markdown, помилки, loading

## Мета

Покращити UX AgentChatPanel: читабельний markdown у відповідях агентів,
зрозумілі українські повідомлення про помилки, кращий loading-стан.

---

## Зміна 1 — useAgentChatStore.ts: переклад помилок

У файлі `src/store/useAgentChatStore.ts` у блоці `catch (e)` замінити:

```typescript
set((s) => ({
  error: { ...s.error, [agentId]: e instanceof Error ? e.message : String(e) },
}));
```

на:

```typescript
const raw = e instanceof Error ? e.message : String(e);
let friendly = raw;
if (raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("fetch")) {
  friendly = "Не вдалося підключитися до агента. Перевірте мережу або спробуйте пізніше.";
} else if (raw.includes("400")) {
  friendly = "Агент повернув помилку запиту (400). Спробуйте ще раз або переформулюйте повідомлення.";
} else if (raw.includes("502") || raw.includes("503")) {
  friendly = "Агент тимчасово недоступний. Зачекайте хвилину та спробуйте.";
} else if (raw.includes("timeout") || raw.includes("Timeout")) {
  friendly = "Агент не відповів вчасно. LLM запити можуть тривати 30-60 секунд — спробуйте ще раз.";
}
set((s) => ({
  error: { ...s.error, [agentId]: friendly },
}));
```

---

## Зміна 2 — AgentChatPanel.tsx: кращий TypingDots з таймером

Замінити компонент `TypingDots` на версію з таймером очікування.
Через 10 секунд очікування показувати підказку "LLM думає, зачекайте…":

```typescript
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
            LLM думає, зачекайте…
          </p>
        )}
      </div>
    </div>
  );
}
```

Не забудь додати `useState` та `useEffect` до імпортів якщо їх ще немає.

---

## Зміна 3 — AgentChatPanel.tsx: повноцінний MarkdownLite

Агенти відповідають з markdown: заголовки `###`, списки `- item`, inline-код `` `code` ``, блоки коду ` ``` `.
Поточний `MarkdownLite` відображає їх як plain text. Замінити його на повноцінний рендерер.

Замінити весь компонент `MarkdownLite` на:

```typescript
function MarkdownLite({ text }: { text: string }) {
  const html = useMemo(() => {
    let t = text;

    // Fenced code blocks  ```lang\n...\n```
    t = t.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
      `<pre class="my-2 overflow-x-auto rounded bg-muted px-3 py-2 text-xs font-mono whitespace-pre">${escHtml(code.trimEnd())}</pre>`
    );

    // Inline code
    t = t.replace(/`([^`]+)`/g, (_, c) =>
      `<code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">${escHtml(c)}</code>`
    );

    // Bold
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Italic
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Headers (process line by line)
    const lines = t.split("\n");
    const out: string[] = [];
    let inList = false;

    for (const line of lines) {
      if (/^### (.+)/.test(line)) {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h3 class="mt-3 mb-1 text-sm font-semibold">${line.replace(/^### /, "")}</h3>`);
      } else if (/^## (.+)/.test(line)) {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h2 class="mt-4 mb-1 text-sm font-bold">${line.replace(/^## /, "")}</h2>`);
      } else if (/^# (.+)/.test(line)) {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(`<h1 class="mt-4 mb-1 text-base font-bold">${line.replace(/^# /, "")}</h1>`);
      } else if (/^[-*] (.+)/.test(line)) {
        if (!inList) { out.push('<ul class="my-1 ml-4 list-disc space-y-0.5">'); inList = true; }
        out.push(`<li class="text-sm">${line.replace(/^[-*] /, "")}</li>`);
      } else if (/^\d+\. (.+)/.test(line)) {
        if (!inList) { out.push('<ol class="my-1 ml-4 list-decimal space-y-0.5">'); inList = true; }
        out.push(`<li class="text-sm">${line.replace(/^\d+\. /, "")}</li>`);
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push(line === "" ? "<br />" : `<p class="text-sm leading-relaxed">${line}</p>`);
      }
    }
    if (inList) out.push("</ul>");

    return out.join("\n");
  }, [text]);

  return (
    <div
      className="prose-sm max-w-none break-words"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

Видали стару функцію `MarkdownLite` і `escHtml` якщо вона вже є.

---

## Результат

- Відповіді агентів з заголовками, списками, кодом відображаються красиво
- "Failed to fetch" → зрозумілий текст українською
- Loading показує таймер і підказку через 10 секунд
- Кнопка "Повторити" залишається як є — вона вже є в коді

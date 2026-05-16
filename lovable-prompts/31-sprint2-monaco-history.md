# Lovable Prompt 31 — Sprint 2: Monaco Editor + localStorage History

## Summary

Sprint 2 adds syntax-highlighted code output (Monaco Editor) and localStorage-based run history to the Pipeline B panel.

## Task 2.1: Monaco Editor in CodeGenerationPanel

### Install dependency
Add `@monaco-editor/react` to package.json.

### Modify `src/components/pipeline/CodeGenerationPanel.tsx`

1. Add import:
```tsx
import { Editor } from "@monaco-editor/react";
```

2. Replace the `<pre>` block (in the `status === "done"` section):
```tsx
// BEFORE:
<pre className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] p-3 font-mono text-[11px] overflow-auto max-h-[160px] text-[var(--text-primary)] leading-relaxed whitespace-pre">
  <code>{result.code}</code>
</pre>

// AFTER:
<div className="border border-[var(--border-default)] overflow-hidden">
  <Editor
    height="160px"
    language={result.language === "typescript" ? "typescript" : result.language === "javascript" ? "javascript" : "python"}
    value={result.code ?? ""}
    theme="vs-dark"
    options={{
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 12,
      lineNumbers: "on",
      wordWrap: "on",
      domReadOnly: true,
      contextmenu: false,
    }}
  />
</div>
```

3. Keep the copy button overlay intact (the `div.relative.group` wrapping should wrap both the Editor and the copy button).

## Task 2.2: localStorage History

### Create `src/lib/pipeline-history.ts`

```typescript
export interface GenerationHistoryEntry {
  id: string;
  timestamp: number;
  diagramName: string;
  language: string;
  result: import("./pipeline-api").GenerateResult;
}

const GENERATION_KEY = "drakon:generation-history";
const MAX_ENTRIES = 20;

export function saveGenerationResult(entry: GenerationHistoryEntry): void {
  const existing = getGenerationHistory();
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  localStorage.setItem(GENERATION_KEY, JSON.stringify(updated));
}

export function getGenerationHistory(): GenerationHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(GENERATION_KEY) ?? "[]");
  } catch {
    return [];
  }
}
```

### Modify `src/components/pipeline/CodeGenerationPanel.tsx`

1. Import:
```tsx
import { saveGenerationResult, getGenerationHistory, type GenerationHistoryEntry } from "@/lib/pipeline-history";
```

2. Add state:
```tsx
const [history, setHistory] = useState<GenerationHistoryEntry[]>(() => getGenerationHistory());
```

3. In the `streamJob` callback, after `setStatus("done")`, add:
```tsx
const entry: GenerationHistoryEntry = {
  id: jobId ?? crypto.randomUUID(),
  timestamp: Date.now(),
  diagramName: diagramName ?? "diagram",
  language: lang,
  result: data.result,
};
saveGenerationResult(entry);
setHistory(getGenerationHistory());
```

4. In the idle state (before the Textarea), show history if available:
```tsx
{status === "idle" && history.length > 0 && (
  <div className="flex flex-col gap-1">
    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
      Останні генерації
    </span>
    {history.slice(0, 4).map((h) => (
      <button
        key={h.id}
        type="button"
        onClick={() => { setResult(h.result); setStatus("done"); }}
        className="flex items-center justify-between w-full rounded-[var(--radius-sm)] px-2 py-1 text-left hover:bg-[var(--bg-overlay)] transition-colors group"
      >
        <span className="font-mono text-[10px] text-[var(--text-primary)] truncate max-w-[120px]">
          {h.diagramName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded bg-[var(--accent-amber)]/15 px-1 py-0.5 font-mono text-[9px] text-[var(--accent-amber)]">
            {h.language}
          </span>
          <span className="font-mono text-[9px] text-[var(--text-muted)] tabular-nums">
            {new Date(h.timestamp).toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            {h.result.iterations}×
          </span>
        </div>
      </button>
    ))}
  </div>
)}
```

## Constraints

- TypeScript must compile without errors (`npx tsc --noEmit --skipLibCheck`)
- Do NOT change header, language selector, running state, error state
- Do NOT change pipeline-api.ts
- Mirror all changes to `.lovable/src/` after editing `src/`
- Commit: `feat: Sprint 2 — Monaco editor + localStorage run history`
- Push: `git push origin main && git push drakon-flow-new main`

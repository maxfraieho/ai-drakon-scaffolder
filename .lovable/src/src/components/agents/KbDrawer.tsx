import { cn } from "@/lib/utils";
import type { KbFile } from "@/lib/agent-studio-data";

interface Props {
  open: boolean;
  kbFiles: KbFile[];
  selectedFile: KbFile | null;
  onToggle: () => void;
  onSelectFile: (f: KbFile) => void;
}

const SAMPLE_CONTENT: Record<string, string> = {
  "00-drakon-rules.md": `# DRAKON Topological Invariants

1. **Shampoor (vertical spine)** — main success path is always the leftmost vertical line.
2. **No edge crossings** — diagrams must be planar.
3. **Single START, single END** — every diagram has exactly one entry and one exit.
4. **Decision branches go right** — error / negative branches go to the right.
5. **Loops use loop_start / loop_end** pair with explicit body.
`,
  "01-node-patterns.md": `# Python → DRAKON Node Mapping

| Python    | DRAKON                  |
|-----------|-------------------------|
| assignment| action                  |
| if / elif | decision                |
| for/while | loop_start + loop_end   |
| return    | terminator              |
| try/except| decision + action       |
`,
  "02-ir-format.md": `# DRAKON IR JSON schema

{
  "node_id": {
    "type": "action | decision | terminator | loop_start | loop_end",
    "text": "label",
    "next": "id",
    "yes": "id",
    "no":  "id"
  }
}
`,
};

export function KbDrawer({ open, kbFiles, selectedFile, onToggle, onSelectFile }: Props) {
  const content =
    selectedFile?.content ??
    (selectedFile ? SAMPLE_CONTENT[selectedFile.filename] ?? "Перегляд недоступний." : "");

  return (
    <div
      className={cn(
        "shrink-0 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] transition-[height] duration-200",
        open ? "h-[260px]" : "h-10"
      )}
    >
      <button
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 hover:bg-[var(--color-surface-container)]"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-primary-container)]">
            database
          </span>
          <span className="font-headline-sm text-[var(--color-on-surface)]">БАЗА ЗНАНЬ</span>
          <span className="font-mono-label text-[var(--color-on-surface-variant)]">
            {kbFiles.length} файлів
          </span>
        </div>
        <span
          className={cn(
            "material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform",
            open && "rotate-180"
          )}
        >
          expand_less
        </span>
      </button>

      {open && (
        <div className="flex h-[calc(100%-2.5rem)]">
          <div className="w-[220px] shrink-0 overflow-y-auto border-r border-[var(--color-outline-variant)]">
            {kbFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectFile(f)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left transition-colors",
                  selectedFile?.id === f.id
                    ? "border-[var(--color-primary-container)] bg-[var(--color-surface-container-high)]"
                    : "border-transparent hover:bg-[var(--color-surface-container-low)]"
                )}
              >
                <span className="font-mono-code text-[var(--color-on-surface)]">{f.filename}</span>
                <span className="font-ui-sm line-clamp-1 text-[var(--color-on-surface-variant)]">
                  {f.description}
                </span>
              </button>
            ))}
            {kbFiles.length === 0 && (
              <div className="p-3 font-mono-label text-[var(--color-on-surface-variant)]">
                Немає файлів для цього агента.
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto bg-[var(--color-surface-container-lowest)] p-4">
            {selectedFile ? (
              <pre className="font-mono-code whitespace-pre-wrap text-[var(--color-on-surface)]">
                {content}
              </pre>
            ) : (
              <p className="font-ui-sm text-[var(--color-on-surface-variant)]">
                Оберіть файл для перегляду.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) return;
    onChange([...tags, t]);
  };

  const removeTag = (t: string) => {
    onChange(tags.filter((x) => x !== t));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs"
        >
          #{t}
          <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground" type="button">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => {
          if (input.trim()) {
            addTag(input);
            setInput("");
          }
        }}
        placeholder={tags.length === 0 ? "Додати тег…" : ""}
        className="flex-1 min-w-[100px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Save, Loader2, Eye, Edit3, RotateCcw, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./EditorToolbar";
import { TagEditor } from "./TagEditor";
import { NoteRenderer } from "./NoteRenderer";
import { detectWikilinkTrigger } from "@/lib/garden/wikilinkParser";
import type { WikilinkSuggestion } from "@/lib/garden/graphTypes";

interface NoteEditorProps {
  title: string;
  content: string;
  tags: string[];
  isDirty: boolean;
  isSaving: boolean;
  hasDraft: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTagsChange: (v: string[]) => void;
  onSave: () => void | Promise<void>;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;
  wikilinkSuggestions: WikilinkSuggestion[];
  insertAtCursor: (text: string, opts?: { selectInside?: boolean }) => void;
  currentSlug?: string;
}

type Mode = "edit" | "preview";

export function NoteEditor(props: NoteEditorProps) {
  const {
    title,
    content,
    tags,
    isDirty,
    isSaving,
    hasDraft,
    onTitleChange,
    onContentChange,
    onTagsChange,
    onSave,
    onRestoreDraft,
    onDiscardDraft,
    wikilinkSuggestions,
    insertAtCursor,
  } = props;

  const [mode, setMode] = useState<Mode>("edit");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [autocomplete, setAutocomplete] = useState<{ query: string; start: number } | null>(null);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!autocomplete) setHighlight(0);
  }, [autocomplete]);

  const filteredSuggestions = autocomplete
    ? wikilinkSuggestions
        .filter((s) =>
          s.title.toLowerCase().includes(autocomplete.query.toLowerCase()) ||
          s.slug.toLowerCase().includes(autocomplete.query.toLowerCase()),
        )
        .slice(0, 6)
    : [];

  const handleContentChange = (v: string) => {
    onContentChange(v);
    const ta = taRef.current;
    if (ta) {
      const trigger = detectWikilinkTrigger(v, ta.selectionStart);
      setAutocomplete(trigger);
    }
  };

  const insertSuggestion = (slug: string) => {
    if (!autocomplete) return;
    const ta = taRef.current;
    if (!ta) return;
    const before = content.slice(0, autocomplete.start);
    const afterCursor = content.slice(ta.selectionStart);
    const next = before + `[[${slug}]]` + afterCursor;
    onContentChange(next);
    setAutocomplete(null);
    requestAnimationFrame(() => {
      const pos = (before + `[[${slug}]]`).length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(filteredSuggestions[highlight].slug);
        return;
      }
      if (e.key === "Escape") {
        setAutocomplete(null);
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "b" && !e.shiftKey) {
      e.preventDefault();
      wrap("**", "**", "bold text");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "i" && !e.shiftKey) {
      e.preventDefault();
      wrap("*", "*", "italic text");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      wrap("[", "](url)", "link text");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "C") {
      e.preventDefault();
      wrap("```\n", "\n```", "code");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "e") {
      e.preventDefault();
      wrap("`", "`", "code");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "p") {
      e.preventDefault();
      setMode((m) => (m === "edit" ? "preview" : "edit"));
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      void onSave();
    }
  };

  const wrap = (left: string, right = left, placeholder = "") => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + left + sel + right + content.slice(end);
    onContentChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const s = start + left.length;
      ta.setSelectionRange(s, s + sel.length);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-3 py-2">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Заголовок нотатки"
          className="h-8 flex-1 border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
        />
        {props.currentSlug && props.currentSlug.includes("/") && (
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-xs text-muted-foreground" title="Папка документа">
            <Folder className="h-3 w-3" />
            <span>{props.currentSlug.split("/").slice(0, -1).join("/")}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={mode === "edit" ? "secondary" : "ghost"}
            className="h-7"
            onClick={() => setMode("edit")}
          >
            <Edit3 className="mr-1 h-3 w-3" />
            Редагувати
          </Button>
          <Button
            size="sm"
            variant={mode === "preview" ? "secondary" : "ghost"}
            className="h-7"
            onClick={() => setMode("preview")}
          >
            <Eye className="mr-1 h-3 w-3" />
            Перегляд
          </Button>
          <Button size="sm" className="h-7" onClick={() => void onSave()} disabled={isSaving || !isDirty}>
            {isSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Зберегти
          </Button>
        </div>
      </div>

      {/* Tags + draft notice */}
      <div className="flex flex-col gap-1.5 border-b border-border px-3 py-2">
        <TagEditor tags={tags} onChange={onTagsChange} />
        {hasDraft && (
          <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs">
            <span className="text-amber-600 dark:text-amber-400">Знайдено незбережену чернетку</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onRestoreDraft}>
                <RotateCcw className="mr-1 h-3 w-3" /> Відновити
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onDiscardDraft}>
                <Trash2 className="mr-1 h-3 w-3" /> Видалити
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {mode === "edit" ? (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <EditorToolbar onWrap={wrap} onInsert={insertAtCursor} />
          <div className="relative flex-1">
            <textarea
              ref={taRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKey}
              onClick={() => {
                const ta = taRef.current;
                if (ta) setAutocomplete(detectWikilinkTrigger(content, ta.selectionStart));
              }}
              placeholder="Пишіть Markdown… Використайте [[wiki-link]] для зв'язків між нотатками."
              className="absolute inset-0 h-full w-full resize-none bg-background p-3 font-mono text-sm leading-relaxed outline-none"
              spellCheck={false}
            />
            {autocomplete && filteredSuggestions.length > 0 && (
              <div className="absolute left-3 top-3 z-10 w-64 rounded-md border border-border bg-popover shadow-lg">
                <div className="border-b border-border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Вставити wiki-посилання
                </div>
                <ul>
                  {filteredSuggestions.map((s, i) => (
                    <li key={s.slug}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertSuggestion(s.slug);
                        }}
                        className={cn(
                          "block w-full px-2 py-1 text-left text-xs hover:bg-muted",
                          i === highlight && "bg-muted",
                        )}
                      >
                        <div className="font-medium">{s.title}</div>
                        <div className="text-[10px] text-muted-foreground">{s.slug}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">
            {content.trim() ? (
              <NoteRenderer content={content} />
            ) : (
              <p className="text-sm italic text-muted-foreground">Порожня нотатка</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Plus, Loader2, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NoteEditor } from "@/components/docs/garden/NoteEditor";
import { useNotesEditor } from "@/hooks/useNotesEditor";
import { fetchNotesList, type NoteListItem } from "@/lib/garden/notesApi";

const NEW_SLUG = "__new__";

interface NotesTabProps {
  focusSlug?: string | null;
  onFocusClear?: () => void;
}

export function NotesTab({ focusSlug, onFocusClear }: NotesTabProps = {}) {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const editorSlug = activeSlug === NEW_SLUG ? undefined : activeSlug ?? undefined;
  const editor = useNotesEditor({ slug: editorSlug });

  // Respond to external navigation (e.g., click from graph)
  useEffect(() => {
    if (focusSlug) {
      setActiveSlug(focusSlug);
      onFocusClear?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSlug]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      setNotes(await fetchNotesList());
    } catch (e) {
      console.error("notes list error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const handleSave = async () => {
    const savedSlug = await editor.save();
    if (savedSlug) {
      await loadNotes();
      setActiveSlug(savedSlug);
    }
  };

  const wikilinkSuggestions = notes.map((n) => ({
    title: (n.slug.split("/").pop() ?? n.slug).replace(/\.md$/, ""),
    slug: n.slug,
  }));

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] gap-0 overflow-hidden rounded-lg border border-border">
      {/* Sidebar */}
      <div className="flex w-52 shrink-0 flex-col border-r border-border bg-muted/20">
        <div className="flex items-center justify-between border-b border-border p-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Нотатки
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={loadNotes}
              disabled={loading}
              title="Оновити"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setActiveSlug(NEW_SLUG)}
              title="Нова нотатка"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Нотаток поки немає
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {notes.map((note) => (
                <button
                  key={note.slug}
                  onClick={() => setActiveSlug(note.slug)}
                  className={cn(
                    "w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                    activeSlug === note.slug && "bg-muted font-medium",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {(note.slug.split("/").pop() ?? note.slug).replace(/\.md$/, "")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeSlug === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              Оберіть нотатку або{" "}
              <button
                className="underline transition-colors hover:text-foreground"
                onClick={() => setActiveSlug(NEW_SLUG)}
              >
                створіть нову
              </button>
            </p>
          </div>
        ) : (
          <NoteEditor
            title={editor.title}
            content={editor.content}
            tags={editor.tags}
            isDirty={editor.isDirty}
            isSaving={editor.isSaving}
            hasDraft={editor.hasDraft}
            onTitleChange={editor.setTitle}
            onContentChange={editor.setContent}
            onTagsChange={editor.setTags}
            onSave={handleSave}
            onRestoreDraft={editor.restoreDraft}
            onDiscardDraft={editor.discardDraft}
            wikilinkSuggestions={wikilinkSuggestions}
            insertAtCursor={editor.insertAtCursor}
          />
        )}
      </div>
    </div>
  );
}

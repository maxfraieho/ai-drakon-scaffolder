import { useState, useEffect } from "react";
import {
  Plus, Loader2, RefreshCw, FileText, Folder, FolderOpen,
  ChevronDown, ChevronRight, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NoteEditor } from "@/components/docs/garden/NoteEditor";
import { useNotesEditor } from "@/hooks/useNotesEditor";
import { fetchNotesTree, deleteNote, type TreeNode } from "@/lib/garden/notesApi";
import { toast } from "sonner";

const NEW_SLUG = "__new__";

interface NotesTabProps {
  focusSlug?: string | null;
  onFocusClear?: () => void;
}

function SidebarTreeNode({
  node,
  level,
  activeSlug,
  onNoteClick,
  onDeleteNote,
}: {
  node: TreeNode;
  level: number;
  activeSlug: string | null;
  onNoteClick: (slug: string) => void;
  onDeleteNote: (slug: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.type === "note") {
    const isActive = activeSlug === node.slug;
    return (
      <div
        className={cn(
          "group flex w-full items-center rounded transition-colors hover:bg-muted",
          isActive && "bg-muted",
        )}
        style={{ paddingLeft: `${8 + level * 14}px` }}
      >
        <button
          onClick={() => onNoteClick(node.slug!)}
          className={cn(
            "flex flex-1 items-center gap-1.5 py-1.5 text-left text-xs",
            isActive && "font-medium",
          )}
        >
          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.title ?? node.slug}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNote(node.slug!);
          }}
          className="mr-1 h-5 w-5 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Видалити"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-muted/60 text-muted-foreground"
        style={{ paddingLeft: `${8 + level * 14}px` }}
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/60" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-primary/60" />}
        <span className="truncate">{node.name}</span>
      </button>
      {open && (node.children ?? []).map((child, i) => (
        <SidebarTreeNode
          key={child.slug ?? child.path ?? i}
          node={child}
          level={level + 1}
          activeSlug={activeSlug}
          onNoteClick={onNoteClick}
          onDeleteNote={onDeleteNote}
        />
      ))}
    </div>
  );
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => (n.type === "note" ? [n] : flattenTree(n.children ?? [])));
}

export function NotesTab({ focusSlug, onFocusClear }: NotesTabProps = {}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const editorSlug = activeSlug === NEW_SLUG ? undefined : activeSlug ?? undefined;
  const editor = useNotesEditor({ slug: editorSlug });

  useEffect(() => {
    if (focusSlug) {
      setActiveSlug(focusSlug);
      onFocusClear?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSlug]);

  const loadTree = async () => {
    setLoading(true);
    try {
      setTree(await fetchNotesTree());
    } catch (e) {
      console.error("notes tree error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTree();
  }, []);

  const handleSave = async () => {
    const savedSlug = await editor.save();
    if (savedSlug) {
      await loadTree();
      setActiveSlug(savedSlug);
    }
  };

  const handleDeleteNote = async (slug: string) => {
    const title = flattenTree(tree).find((n) => n.slug === slug)?.title ?? slug;
    if (!window.confirm(`Видалити документ «${title}»? Це незворотня дія.`)) return;
    try {
      await deleteNote(slug);
      if (activeSlug === slug) setActiveSlug(null);
      await loadTree();
      toast.success("Документ видалено");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Помилка видалення");
    }
  };

  const wikilinkSuggestions = flattenTree(tree).map((n) => ({
    title: (n.slug?.split("/").pop() ?? n.slug ?? "").replace(/\.md$/, ""),
    slug: n.slug!,
  }));

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col gap-0 overflow-hidden rounded-lg border border-border md:flex-row">
      <div className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-border bg-muted/20 md:max-h-none md:w-52 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-border p-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Документи
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={loadTree} disabled={loading} title="Оновити">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setActiveSlug(NEW_SLUG)} title="Новий документ">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : tree.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Документів поки немає
            </div>
          ) : (
            <div className="space-y-0 p-1">
              {tree.map((node, i) => (
                <SidebarTreeNode
                  key={node.slug ?? node.path ?? i}
                  node={node}
                  level={0}
                  activeSlug={activeSlug}
                  onNoteClick={setActiveSlug}
                  onDeleteNote={handleDeleteNote}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeSlug === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              Оберіть документ або{" "}
              <button
                className="underline transition-colors hover:text-foreground"
                onClick={() => setActiveSlug(NEW_SLUG)}
              >
                створіть новий
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
            currentSlug={activeSlug === NEW_SLUG ? undefined : activeSlug}
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

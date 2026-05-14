# Prompt 24: "Документи" + "Файли" tab + sidebar folder tree

## Context

Files to change:
- `src/routes/docs.tsx`
- `src/components/docs/NotesTab.tsx`
- `src/lib/garden/notesApi.ts`

New file to create:
- `src/components/docs/DocsFilesTab.tsx`

Backend `GET /v1/notes/list?flat=false` already works and returns:
```json
{
  "success": true,
  "tree": [
    {
      "type": "folder",
      "name": "agents",
      "path": "agents",
      "children": [
        { "type": "note", "slug": "agents/intro", "title": "Introduction", "path": "agents/intro.md", "size": 1240 },
        { "type": "folder", "name": "advanced", "path": "agents/advanced", "children": [...] }
      ]
    },
    { "type": "note", "slug": "index", "title": "Home", "path": "index.md", "size": 320 }
  ]
}
```

---

## Changes

### 1. `src/lib/garden/notesApi.ts` — add TreeNode type and fetchNotesTree()

Add after the existing exports:

```typescript
export interface TreeNode {
  type: 'folder' | 'note';
  // folder fields
  name?: string;
  path: string;
  children?: TreeNode[];
  // note fields
  slug?: string;
  title?: string;
  size?: number;
}

export async function fetchNotesTree(): Promise<TreeNode[]> {
  const res = await fetch(`${workerUrl()}/v1/notes/list?flat=false`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`notes/tree HTTP ${res.status}`);
  const data = (await res.json()) as { tree?: TreeNode[] };
  return data.tree ?? [];
}
```

---

### 2. `src/components/docs/NotesTab.tsx` — replace flat sidebar with folder tree

Replace the entire sidebar section (the `<div className="flex w-52 ...">` block) with a folder tree sidebar. The sidebar keeps the same `w-52` width, but instead of a flat list of notes it renders a recursive tree. Here is the complete replacement for the sidebar div and its supporting logic:

```tsx
import { useState, useEffect } from "react";
import { Plus, Loader2, RefreshCw, FileText, Folder, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NoteEditor } from "@/components/docs/garden/NoteEditor";
import { useNotesEditor } from "@/hooks/useNotesEditor";
import { fetchNotesTree, type TreeNode } from "@/lib/garden/notesApi";

const NEW_SLUG = "__new__";

interface NotesTabProps {
  focusSlug?: string | null;
  onFocusClear?: () => void;
}

// Recursive tree node for the sidebar
function SidebarTreeNode({
  node,
  level,
  activeSlug,
  onNoteClick,
}: {
  node: TreeNode;
  level: number;
  activeSlug: string | null;
  onNoteClick: (slug: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.type === 'note') {
    const isActive = activeSlug === node.slug;
    return (
      <button
        onClick={() => onNoteClick(node.slug!)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
          isActive && "bg-muted font-medium",
        )}
        style={{ paddingLeft: `${8 + level * 14}px` }}
      >
        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.title ?? node.slug}</span>
      </button>
    );
  }

  // folder
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-muted/60 text-muted-foreground"
        style={{ paddingLeft: `${8 + level * 14}px` }}
      >
        {open
          ? <ChevronDown className="h-3 w-3 shrink-0" />
          : <ChevronRight className="h-3 w-3 shrink-0" />}
        {open
          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          : <Folder className="h-3.5 w-3.5 shrink-0 text-primary/60" />}
        <span className="truncate">{node.name}</span>
      </button>
      {open && (node.children ?? []).map((child, i) => (
        <SidebarTreeNode
          key={child.slug ?? child.path ?? i}
          node={child}
          level={level + 1}
          activeSlug={activeSlug}
          onNoteClick={onNoteClick}
        />
      ))}
    </div>
  );
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

  useEffect(() => { void loadTree(); }, []);

  const handleSave = async () => {
    const savedSlug = await editor.save();
    if (savedSlug) {
      await loadTree();
      setActiveSlug(savedSlug);
    }
  };

  // Flatten tree for wikilink suggestions
  const flattenTree = (nodes: TreeNode[]): TreeNode[] =>
    nodes.flatMap(n => n.type === 'note' ? [n] : flattenTree(n.children ?? []));

  const wikilinkSuggestions = flattenTree(tree).map(n => ({
    title: (n.slug?.split('/').pop() ?? n.slug ?? '').replace(/\.md$/, ''),
    slug: n.slug!,
  }));

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] gap-0 overflow-hidden rounded-lg border border-border">
      {/* Sidebar */}
      <div className="flex w-52 shrink-0 flex-col border-r border-border bg-muted/20">
        <div className="flex items-center justify-between border-b border-border p-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Документи
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={loadTree}
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
              title="Новий документ"
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
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Editor panel — keep exactly as-is */}
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
```

---

### 3. Create `src/components/docs/DocsFilesTab.tsx`

```tsx
import { useState, useEffect } from "react";
import {
  ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchNotesTree, type TreeNode } from "@/lib/garden/notesApi";

function nodeMatchesSearch(node: TreeNode, q: string): boolean {
  if (!q) return true;
  const lq = q.toLowerCase();
  if (node.type === 'note') {
    return (node.title ?? node.slug ?? '').toLowerCase().includes(lq) ||
           (node.slug ?? '').toLowerCase().includes(lq);
  }
  return (node.children ?? []).some(c => nodeMatchesSearch(c, q));
}

function countNotes(nodes: TreeNode[]): number {
  return nodes.reduce((acc, n) =>
    acc + (n.type === 'note' ? 1 : countNotes(n.children ?? [])), 0);
}

function TreeNodeItem({
  node,
  level,
  onNoteClick,
  searchQuery,
}: {
  node: TreeNode;
  level: number;
  onNoteClick: (slug: string) => void;
  searchQuery: string;
}) {
  const [open, setOpen] = useState(true);

  if (!nodeMatchesSearch(node, searchQuery)) return null;

  if (node.type === 'note') {
    return (
      <button
        onClick={() => onNoteClick(node.slug!)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-muted"
        style={{ paddingLeft: `${12 + level * 18}px` }}
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{node.title ?? node.slug}</span>
        {node.size != null && (
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
            {(node.size / 1024).toFixed(1)}k
          </span>
        )}
      </button>
    );
  }

  // folder
  const noteCount = countNotes(node.children ?? []);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60"
        style={{ paddingLeft: `${12 + level * 18}px` }}
      >
        {open
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        {open
          ? <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
          : <Folder className="h-4 w-4 shrink-0 text-primary/70" />}
        <span className="truncate flex-1 text-left">{node.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{noteCount}</span>
      </button>
      {open && (node.children ?? []).map((child, i) => (
        <TreeNodeItem
          key={child.slug ?? child.path ?? i}
          node={child}
          level={level + 1}
          onNoteClick={onNoteClick}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

interface DocsFilesTabProps {
  onNoteOpen: (slug: string) => void;
}

export function DocsFilesTab({ onNoteOpen }: DocsFilesTabProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try { setTree(await fetchNotesTree()); }
    catch (e) { console.error('tree load error', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col overflow-hidden rounded-lg border border-border">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Пошук документів…"
          className="h-7 flex-1 text-sm"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={load}
          disabled={loading}
          title="Оновити"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        {loading ? "Завантаження…" : `${countNotes(tree)} документів`}
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tree.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Документів немає</div>
        ) : (
          <div className="py-1">
            {tree.map((node, i) => (
              <TreeNodeItem
                key={node.slug ?? node.path ?? i}
                node={node}
                level={0}
                onNoteClick={slug => {
                  onNoteOpen(slug);
                }}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

---

### 4. `src/routes/docs.tsx` — add "Файли" tab + rename "Нотатки"

**4a.** Add imports at the top:
```tsx
import { FolderTree } from "lucide-react";
import { DocsFilesTab } from "@/components/docs/DocsFilesTab";
```

**4b.** Change docsTab type:
```tsx
const [docsTab, setDocsTab] = useState<"generator" | "notes" | "graph" | "files">("generator");
```

**4c.** Add handler for Files→Notes navigation:
```tsx
const handleFileOpen = (slug: string) => {
  setFocusedSlug(slug);
  setDocsTab("notes");
};
```

**4d.** In the `<TabsList>`, rename the notes tab label and insert "Файли" between notes and graph:
```tsx
<TabsTrigger value="notes">
  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
  Документи
</TabsTrigger>
<TabsTrigger value="files">
  <FolderTree className="mr-1.5 h-3.5 w-3.5" />
  Файли
</TabsTrigger>
<TabsTrigger value="graph">
  <Network className="mr-1.5 h-3.5 w-3.5" />
  Граф
</TabsTrigger>
```

**4e.** Add TabsContent for files after the notes content:
```tsx
<TabsContent value="files">
  <DocsFilesTab onNoteOpen={handleFileOpen} />
</TabsContent>
```

---

## Notes
- Do NOT change any graph-related code
- Do NOT change NoteEditor internals
- Do NOT change useNotesEditor hook
- The `handleGraphNodeClick` already sets focusedSlug + switches to "notes" tab — keep that logic
- Keep the `h-[calc(100vh-220px)] min-h-[500px]` height constraint consistent in all three tab panels

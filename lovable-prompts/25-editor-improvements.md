# Prompt 25: Editor improvements — keyboard shortcuts + folder selector + delete button

## Context

Files to change:
- `src/components/docs/garden/NoteEditor.tsx`
- `src/components/docs/NotesTab.tsx`

The editor (`NoteEditor.tsx`) already has:
- Wikilink autocomplete (`[[...]]` syntax)
- Ctrl+S save
- Edit / Preview toggle
- Tag editor
- Draft restoration

What needs to be ADDED:

---

## Changes

### 1. `src/components/docs/garden/NoteEditor.tsx` — keyboard shortcuts for formatting

The editor already has a `wrap(left, right, placeholder)` helper function and the `handleKey` function on the textarea `onKeyDown`. **Add these keyboard shortcuts inside `handleKey`** before the existing Ctrl+S handler:

```tsx
// Ctrl/Cmd + B = Bold
if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !e.shiftKey) {
  e.preventDefault();
  wrap('**', '**', 'bold text');
  return;
}
// Ctrl/Cmd + I = Italic
if ((e.metaKey || e.ctrlKey) && e.key === 'i' && !e.shiftKey) {
  e.preventDefault();
  wrap('*', '*', 'italic text');
  return;
}
// Ctrl/Cmd + K = Link
if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
  e.preventDefault();
  wrap('[', '](url)', 'link text');
  return;
}
// Ctrl/Cmd + Shift + C = Code block
if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
  e.preventDefault();
  wrap('```\n', '\n```', 'code');
  return;
}
// Ctrl/Cmd + E = Inline code
if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
  e.preventDefault();
  wrap('`', '`', 'code');
  return;
}
// Ctrl/Cmd + P = toggle Preview
if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
  e.preventDefault();
  setMode(m => m === 'edit' ? 'preview' : 'edit');
  return;
}
```

Also add a keyboard shortcut hint bar below the toolbar. Add this **inside the edit mode section, right after the `<EditorToolbar>` component** and before the textarea `<div className="relative flex-1">`:

```tsx
{/* Keyboard shortcut hints */}
<div className="flex flex-wrap gap-x-3 border-b border-border/50 bg-muted/5 px-3 py-1 text-[10px] text-muted-foreground">
  <span><kbd className="font-mono">Ctrl+S</kbd> зберегти</span>
  <span><kbd className="font-mono">Ctrl+B</kbd> жирний</span>
  <span><kbd className="font-mono">Ctrl+I</kbd> курсив</span>
  <span><kbd className="font-mono">Ctrl+K</kbd> посилання</span>
  <span><kbd className="font-mono">Ctrl+E</kbd> код</span>
  <span><kbd className="font-mono">Ctrl+P</kbd> перегляд</span>
  <span><kbd className="font-mono">[[</kbd> wiki-посилання</span>
</div>
```

---

### 2. `src/components/docs/garden/NoteEditor.tsx` — add folder display in editor header

**2a.** Add `currentSlug?: string` to `NoteEditorProps` interface.

**2b.** In the editor header row (the `<div className="flex items-center gap-2 border-b ...px-3 py-2">` that contains the title Input and mode buttons), add a folder chip **between the title Input and the mode buttons**:

```tsx
{/* Folder chip: show current folder extracted from slug */}
{props.currentSlug && props.currentSlug.includes('/') && (
  <div className="flex shrink-0 items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1 text-xs text-muted-foreground" title="Папка документа">
    <Folder className="h-3 w-3" />
    <span>{props.currentSlug.split('/').slice(0, -1).join('/')}</span>
  </div>
)}
```

Add `Folder` to the imports from `lucide-react`.

---

### 3. `src/components/docs/NotesTab.tsx` — delete note button + confirmation

**3a.** Add a delete button in the sidebar tree for notes. In the `SidebarTreeNode` component (which was added in Prompt 24), when `node.type === 'note'`, add a delete button that appears on hover:

Replace the simple note button in `SidebarTreeNode` with a group div that shows a delete icon on hover:

```tsx
if (node.type === 'note') {
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
        onClick={(e) => { e.stopPropagation(); onDeleteNote(node.slug!); }}
        className="mr-1 h-5 w-5 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="Видалити"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
```

Add `onDeleteNote: (slug: string) => void` prop to `SidebarTreeNode`.

**3b.** Add delete logic in `NotesTab`. Import:
```tsx
import { Trash2 } from "lucide-react";
import { deleteNote } from "@/lib/garden/notesApi";
```

Add to `notesApi.ts`:
```typescript
export async function deleteNote(slug: string): Promise<void> {
  const token = jwt();
  if (!token) throw new Error("Не авторизовано (JWT відсутній)");
  const res = await fetch(`${workerUrl()}/v1/notes/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`delete HTTP ${res.status}: ${txt}`);
  }
}
```

**3c.** Add `handleDeleteNote` to `NotesTab`:

```tsx
const handleDeleteNote = async (slug: string) => {
  const title = (() => {
    const flatten = (nodes: TreeNode[]): TreeNode[] =>
      nodes.flatMap(n => n.type === 'note' ? [n] : flatten(n.children ?? []));
    return flatten(tree).find(n => n.slug === slug)?.title ?? slug;
  })();

  if (!window.confirm(`Видалити документ «${title}»? Це незворотня дія.`)) return;

  try {
    await deleteNote(slug);
    if (activeSlug === slug) setActiveSlug(null);
    await loadTree();
  } catch (e) {
    console.error("delete error", e);
    alert(`Помилка видалення: ${e instanceof Error ? e.message : String(e)}`);
  }
};
```

Pass `onDeleteNote={handleDeleteNote}` to all `<SidebarTreeNode>` components that render notes (pass it down through the recursive tree).

---

### 4. `src/components/docs/NotesTab.tsx` — pass currentSlug to NoteEditor

In the `<NoteEditor ...>` call inside `NotesTab`, pass `currentSlug={editorSlug}` so the folder chip is visible:

```tsx
<NoteEditor
  ...existing props...
  currentSlug={editorSlug}
/>
```

---

## Notes
- Do NOT change ExecutionGraph.tsx or NotesGraphTab.tsx
- Do NOT change useNotesEditor hook
- Keyboard shortcuts are added to the existing `handleKey` function in NoteEditor — do not restructure the component
- The `deleteNote` API function goes in `notesApi.ts` alongside `commitNote`
- Worker already supports `DELETE /v1/notes/delete` with `{ slug }` body and JWT auth
- Keep `window.confirm()` for delete confirmation — no need for a custom dialog

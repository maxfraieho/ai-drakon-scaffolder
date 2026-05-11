# Lovable Prompt 6 — Файли: Error State + Mobile Layout

**Priority: MEDIUM — apply after Prompts 4 & 5**

## Problem 1 — Error text truncated in narrow column

In the GitHub Files page, when the repo tree fails to load, the error "Не вдало завантажити дерево" is shown as red inline text that gets clipped in the narrow side column.

### Fix — replace inline error with proper error state component

Find where `error` state is rendered in the file tree panel and replace with:

```tsx
{treeError && (
  <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
    <AlertCircleIcon
      className="w-5 h-5 text-red-400 flex-shrink-0"
      aria-hidden="true"
    />
    <p
      className="text-xs text-[var(--text-muted)]"
      style={{ textWrap: 'balance' }}
    >
      Не вдалося завантажити дерево файлів
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="text-xs text-[var(--accent-amber)] hover:underline
                 focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm"
    >
      Спробувати знову
    </button>
  </div>
)}
```

## Problem 2 — File tree column too narrow on mobile

The file tree panel collapses to ~50px on small screens, making it unreadable.

### Fix — responsive layout

Change the file tree panel container:

```tsx
{/* Mobile: full width. Desktop: fixed sidebar */}
<div className={cn(
  "border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]",
  "w-full md:w-64 md:min-w-[200px] md:max-w-[280px]",
  "flex flex-col",
  // On mobile, hide when a file is selected (show preview instead)
  selectedFile && "hidden md:flex"
)}>
  {/* tree content */}
</div>

{/* Preview panel */}
<div className={cn(
  "flex-1 min-w-0 flex flex-col",
  // On mobile, hide when no file selected (show tree instead)
  !selectedFile && "hidden md:flex"
)}>
  {selectedFile ? (
    <div>
      {/* Mobile back button */}
      <button
        type="button"
        onClick={() => setSelectedFile(null)}
        className="md:hidden flex items-center gap-1 px-3 py-2 text-xs
                   text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                   border-b border-[var(--border-subtle)]"
      >
        <ChevronLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
        Назад до файлів
      </button>
      {/* existing file preview content */}
    </div>
  ) : (
    /* Empty state */
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <FileIcon className="w-8 h-8 text-[var(--text-muted)]" aria-hidden="true" />
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
        Оберіть файл
      </p>
    </div>
  )}
</div>
```

## Problem 3 — "Оберіть файл для preview" placeholder

Replace the plain text placeholder with the empty state above (see Problem 2 fix — already included).

## DO NOT change
- GitHub API calls / authentication
- File tree data fetching
- Branch selector
- Repo header bar

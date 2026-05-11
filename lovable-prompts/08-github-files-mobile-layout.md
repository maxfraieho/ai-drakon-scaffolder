# Lovable Prompt 8 — GitHub Files: Mobile Layout + Error State (Retry)

**Priority: HIGH — Prompt 6 was not applied. File tree still ~50px wide on mobile, error text clipped.**

## What's still wrong (from screenshot)

In the GitHub Files page (`github.tsx` or `GitHubFilesPage.tsx`):

1. The file tree panel is collapsed to ~50px — error icon + text "Не вдалося завантажити дерево файлів" is cut off, only 2-3 chars visible per line
2. "Спробувати знову" button text is clipped
3. "Оберіть файл для preview" is still plain small text at the bottom — not the proper empty state
4. On mobile, there's no way to see the file tree at full width

## Fix 1 — Replace the error state in the file tree panel

Find where the tree loading error is rendered (look for the Ukrainian error string "Не вдало" or similar). Replace it with:

```tsx
{treeError && (
  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
    <AlertCircleIcon
      className="w-5 h-5 text-red-400 flex-shrink-0"
      aria-hidden="true"
    />
    <p
      className="text-xs text-[var(--text-muted)] leading-relaxed"
      style={{ textWrap: 'balance' }}
    >
      Не вдалося завантажити дерево файлів
    </p>
    <button
      type="button"
      onClick={refetchTree}
      className="text-xs text-[var(--accent-amber)] hover:underline
                 focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm
                 px-1 py-0.5"
    >
      Спробувати знову
    </button>
  </div>
)}
```

(Use whatever retry function exists — `refetchTree`, `onRetry`, `loadTree`, etc.)

## Fix 2 — Responsive two-panel layout

Find the container div that holds `[file tree sidebar] [file preview]` side by side. Replace with:

```tsx
{/* Add this state if not present: */}
{/* const [selectedFile, setSelectedFile] = useState<FileNode | null>(null); */}

{/* Two-panel container */}
<div className="flex-1 min-h-0 flex overflow-hidden">

  {/* File tree panel */}
  <div
    className={cn(
      "flex flex-col flex-shrink-0",
      "border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]",
      // Mobile: full width when no file selected, hidden when file selected
      // Desktop: fixed 256px sidebar always visible
      selectedFile
        ? "hidden md:flex md:w-64"
        : "flex w-full md:w-64"
    )}
  >
    {/* search bar — unchanged */}
    {/* tree content or error state — see Fix 1 above */}
  </div>

  {/* Preview panel */}
  <div
    className={cn(
      "flex-1 min-w-0 flex flex-col overflow-hidden",
      // Mobile: hidden when no file selected (tree is shown instead)
      !selectedFile && "hidden md:flex"
    )}
  >
    {selectedFile ? (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={() => setSelectedFile(null)}
          className="md:hidden flex-shrink-0 flex items-center gap-2 px-3 py-2
                     text-xs text-[var(--text-secondary)]
                     hover:text-[var(--text-primary)]
                     border-b border-[var(--border-subtle)]"
          style={{ touchAction: 'manipulation' }}
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Назад до файлів
        </button>

        {/* existing file content/code viewer — DO NOT change */}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* file preview here */}
        </div>
      </div>
    ) : (
      /* Desktop empty state — only shown on md+ */
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileIcon className="w-8 h-8 text-[var(--text-muted)]" aria-hidden="true" />
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Оберіть файл
        </p>
      </div>
    )}
  </div>

</div>
```

**Important:** When a file is clicked in the tree on mobile, call `setSelectedFile(node)` — this switches the view from tree to preview automatically.

## Fix 3 — Make the page fill full height

The outer page wrapper must also fill the viewport correctly:

```tsx
<div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
  {/* repo header bar — flex-shrink-0 */}
  <div className="flex-shrink-0 ...">
    {/* branch selector, repo name, back button — unchanged */}
  </div>

  {/* two-panel layout — fills remaining */}
  <div className="flex-1 min-h-0 flex overflow-hidden">
    {/* Fix 2 content above */}
  </div>
</div>
```

## Imports to add if not present

```tsx
import { AlertCircleIcon, ChevronLeftIcon, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
```

## DO NOT change

- GitHub API calls or token handling
- Branch selector logic
- File tree data fetching / tree node structure
- File content rendering / syntax highlighting
- Repo header bar contents

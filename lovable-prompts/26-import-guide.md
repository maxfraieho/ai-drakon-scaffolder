# Prompt 26: Garden Bloom import — deployment guide for prompts 23–25

## What this is

The `import/` directory in this repo contains source files copied from the Garden Bloom project.
They are the reference implementations you must adapt when executing prompts 23, 24, and 25.

**Do NOT copy these files directly.** They have incompatible dependencies that must be replaced.
Read the mapping table in `import/README.md` and use the detailed code in prompts 23–25.

---

## Repo layout

```
ai-drakon-setup/
├── import/                          ← Garden Bloom sources (READ-ONLY reference)
│   ├── README.md                    ← mapping table + key differences
│   ├── components/garden/
│   │   ├── GlobalGraphView.tsx      → becomes ExecutionGraph.tsx (prompt 23)
│   │   ├── FilesPage.tsx            → becomes DocsFilesTab.tsx (prompt 24)
│   │   ├── EditorFolderTree.tsx     → adapted for NotesTab (prompt 25)
│   │   ├── NoteEditor.tsx           → keyboard shortcuts reference (prompt 25)
│   │   ├── WikilinkAutocomplete.tsx → already integrated
│   │   ├── DeleteNoteDialog.tsx     → adapt for deleteNote() API (prompt 25)
│   │   └── EditorToolbar.tsx        → already adapted
│   ├── pages/EditorPage.tsx         → layout reference
│   ├── hooks/
│   │   ├── useNoteEditor.ts         → AI-DRAKON uses useNotesEditor instead
│   │   └── useWikilinkSuggestions.ts → wikilinkParser already present
│   └── lib/notes/
│       ├── linkGraph.ts             → AI-DRAKON uses @/lib/garden/graphTypes
│       ├── types.ts                 → reference only
│       └── wikilinkParser.ts        → already at src/lib/garden/wikilinkParser.ts
├── lovable-prompts/
│   ├── 23-full-graph.md             ← complete adapted ExecutionGraph code
│   ├── 24-files-tab-rename.md       ← complete adapted DocsFilesTab + rename
│   └── 25-editor-improvements.md   ← keyboard shortcuts + delete + folder chip
└── services/docs-agent/             ← FastAPI backend (already deployed)
```

---

## Execution order

Execute prompts in this exact order. Wait for each Lovable commit before starting the next.

### Step 1 — Prompt 23: Full graph

**File:** `lovable-prompts/23-full-graph.md`

Replace `src/components/docs/garden/ExecutionGraph.tsx` with the adapted `GlobalGraphView.tsx`.

**Adaptation rules applied (already done in the prompt code):**
- Import paths: `@/lib/notes/linkGraph` → `@/lib/garden/graphTypes`
- Navigation: `useNavigate()` removed → `onNodeClick?: (slug: string) => void` prop
- Double-click on node: `navigate('/notes/${slug}')` → `onNodeClick?.(node.slug)`
- i18n: `useLocale()` removed → all strings hardcoded in Ukrainian
- Export: `export function ExecutionGraph` (was `GlobalGraphView`)
- `react-markdown` import removed — uses `NoteRenderer` for preview panels

**Verify after:**
- Граф вкладка відображається без помилок
- Можна зробити zoom scroll, drag вузли, шукати в полі пошуку
- Подвійний клік по вузлу відкриває документ у вкладці "Документи"

---

### Step 2 — Prompt 24: "Документи" + "Файли" tab + sidebar tree

**File:** `lovable-prompts/24-files-tab-rename.md`

Four changes in one commit:
1. `notesApi.ts`: add `TreeNode` type + `fetchNotesTree()` calling `GET /v1/notes/list?flat=false`
2. `NotesTab.tsx`: replace flat list with recursive expandable folder tree; rename "Нотатки" → "Документи"
3. New `DocsFilesTab.tsx`: full-height file tree with search + note counts + click-to-open
4. `docs.tsx`: rename tab + add "Файли" tab (FolderTree icon) between "Документи" and "Граф"

**API response shape for `fetchNotesTree()`:**
```json
{
  "success": true,
  "tree": [
    {
      "type": "folder",
      "name": "agents",
      "path": "agents",
      "children": [
        { "type": "note", "slug": "agents/intro", "title": "Introduction", "path": "agents/intro.md", "size": 1240 }
      ]
    },
    { "type": "note", "slug": "index", "title": "Home", "path": "index.md", "size": 320 }
  ]
}
```

**Verify after:**
- Вкладка "Нотатки" перейменована в "Документи"
- Нова вкладка "Файли" з'явилась між "Документи" і "Граф"
- У сайдбарі "Документи" відображається дерево папок (ChevronDown/ChevronRight) замість плоского списку
- Клік по файлу у вкладці "Файли" → відкриває документ у вкладці "Документи"

---

### Step 3 — Prompt 25: Editor improvements

**File:** `lovable-prompts/25-editor-improvements.md`

Three improvements:
1. **Keyboard shortcuts** in `NoteEditor.tsx`: Ctrl+B bold, Ctrl+I italic, Ctrl+K link, Ctrl+E inline code, Ctrl+P preview toggle + hint bar
2. **Folder chip** in editor header: shows current folder path extracted from note slug
3. **Delete button** in sidebar: hover trash icon on notes → `window.confirm()` → `deleteNote(slug)` → reload tree

`deleteNote()` function goes in `notesApi.ts`:
```typescript
export async function deleteNote(slug: string): Promise<void> {
  const token = localStorage.getItem("jwt");
  if (!token) throw new Error("Не авторизовано");
  const res = await fetch(`${workerUrl()}/v1/notes/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) throw new Error(`delete HTTP ${res.status}`);
}
```

Worker already handles `DELETE /v1/notes/delete` with JWT auth.

**Verify after:**
- Ctrl+S зберігає нотатку
- Ctrl+B обгортає виділений текст в `**...**`
- Ctrl+P перемикає між режимами "Редагувати" / "Перегляд"
- При наведенні на нотатку в сайдбарі з'являється іконка кошика
- Клік по кошику → confirm діалог → видаляє → оновлює дерево
- У заголовку редактора видно папку (напр. `agents`) коли slug = `agents/intro`

---

## Common errors to avoid

| Error | Fix |
|---|---|
| `Cannot find module 'react-markdown'` | Do not import react-markdown. Use `NoteRenderer` component already in the project. |
| `useNavigate is not defined` | Remove react-router navigation. Use `onNodeClick?(slug)` callback prop instead. |
| `getFolderStructure is not a function` | This is Garden Bloom's sync function. Replace with `await fetchNotesTree()` from `notesApi.ts`. |
| `t.graph.xxx is undefined` | Remove `useLocale()`. Hardcode Ukrainian string literals directly. |
| `TreeNode type not found` | Export `TreeNode` from `notesApi.ts` alongside `fetchNotesTree`. |
| 401 on DELETE /v1/notes/delete | Pass `Authorization: Bearer ${jwt}` header. The Worker requires JWT for write operations. |
| Sidebar shows nothing after tree switch | `fetchNotesTree()` is async — use `useState<TreeNode[]>([])` + `useEffect(() => { void load(); }, [])`. |

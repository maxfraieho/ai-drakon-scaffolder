# Garden Bloom → AI-DRAKON: source reference files

Copied from: `/home/vokov/projects/garden-seedling/src/`
Purpose: Reference for Lovable prompts 23–25. DO NOT copy directly — see adaptation rules below.

## Files by prompt

### Prompt 23 — Full graph (`ExecutionGraph.tsx`)
| File | Use |
|------|-----|
| `components/garden/GlobalGraphView.tsx` | **Adapt as `ExecutionGraph`.** Full SVG force graph: zoom/pan, search, depth slider, edge filter, focus mode, folder colors. |
| `lib/notes/linkGraph.ts` | Graph types reference. AI-DRAKON uses `@/lib/garden/graphTypes`. |

### Prompt 24 — "Файли" tab + sidebar tree
| File | Use |
|------|-----|
| `pages/FilesPage.tsx` | **Adapt as `DocsFilesTab`.** Expandable folder/note tree with search. |

### Prompt 25 — Editor improvements
| File | Use |
|------|-----|
| `components/garden/NoteEditor.tsx` | Keyboard shortcuts: Ctrl+B/I/K/E/P. Reference only. |
| `components/garden/EditorFolderTree.tsx` | Folder picker sidebar — adapt with async `fetchNotesTree()`. |
| `components/garden/DeleteNoteDialog.tsx` | Delete confirm dialog. |
| `components/garden/WikilinkAutocomplete.tsx` | Already integrated in AI-DRAKON. |
| `hooks/useNoteEditor.ts` | State hook — AI-DRAKON uses `useNotesEditor` instead. |
| `hooks/useWikilinkSuggestions.ts` | Wikilink detection — AI-DRAKON uses `wikilinkParser`. |

## Key adaptation rules

| Garden Bloom | AI-DRAKON |
|---|---|
| `getFolderStructure()` (sync) | `await fetchNotesTree()` from `notesApi.ts` |
| `useNavigate()` | callback prop `onNodeClick?(slug: string)` |
| `useLocale()` / `t.*` strings | hardcode Ukrainian strings directly |
| `<Link to="/notes/slug">` | call `onNoteClick(slug)` / `onNoteOpen(slug)` |
| `import 'react-markdown'` | use `NoteRenderer` component (already in project) |
| `useOwnerAuth()` | `localStorage.getItem("jwt")` |
| tree data from `noteLoader.ts` | tree data from `GET /v1/notes/list?flat=false` |

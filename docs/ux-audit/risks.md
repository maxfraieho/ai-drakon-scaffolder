# Implementation Risks — Pipeline UI

## Risk 1: DiagramsPage is large and complex

**Evidence:** DiagramsPage.tsx is 44KB+ with state for GitHub panel, folder management, diagram storage, analysis requests, git operations.

**Risk:** Adding `analysisOpen`/`generationOpen` state and conditional flex wrappers to an already complex component may create layout regressions — especially if the existing layout uses absolute positioning or fixed heights anywhere.

**Mitigation:** Before wrapping with flex, check if DiagramsPage uses `position: absolute` for the editor canvas (DrakonWidget). If it does, a flex wrapper will break it. The CodeAnalysisPanel may need to be positioned as `position: fixed right-0 top-12 h-[calc(100vh-3rem)]` instead of a flex sibling. Read DiagramsPage layout before implementing.

---

## Risk 2: `diagramIr` shape for Pipeline B

**Evidence:** Diagrams in DiagramsPage are stored as `Diagram` type from `src/types/drakon.ts`. The DRAKON IR that Pipeline B expects is a single `{name, params, items}` dict. A `Diagram` may contain multiple functions or have different field names.

**Risk:** `CodeGenerationPanel` may receive the wrong object shape.

**Mitigation:** When reading `selectedDiagram` in DiagramsPage, pass `{ name: selectedDiagram.name, params: selectedDiagram.params ?? "", items: selectedDiagram.items }` explicitly — not the full Diagram object. Verify the types match `validator/ir_validator.py` expectations.

---

## Risk 3: `onImportIr` — what happens when IR is imported

**Evidence:** `upsertDiagramInStorage` exists in DiagramsPage. The DRAKON widget renders from `items`. Pipeline A returns a list of IR dicts (one per function).

**Risk:** Multi-function analysis produces N diagrams. If `onImportIr` is called in a loop, the user gets N new diagrams added to storage at once with no context.

**Mitigation:** Show the function list in the panel and let the user choose which to import individually. The "↓ Імпортувати" button per function row handles this correctly. Don't add an "Import All" button.

---

## Risk 4: in-memory job_store

**Evidence:** `pipeline/job_store.py` uses a Python dict. Service restart = job IDs invalidated.

**Risk:** If architect-agent restarts while a job is polling, the frontend gets 404 on status and enters error state.

**Mitigation:** In `CodeAnalysisPanel` and `CodeGenerationPanel`, handle 404 on status poll explicitly: show "Сервіс недоступний — спробуйте знову" and clear the job_id. Don't retry 404 indefinitely.

---

## Risk 5: "Файли" tab removal and DocsFilesTab.tsx

**Evidence:** `DocsFilesTab` is imported in `docs.tsx` only. If the tab is removed, the component becomes dead code.

**Risk:** Low — no other users. Safe to remove import.

**Note:** The `DocsFilesTab` tree logic (search + note count) must be reproduced in `NotesTab` sidebar before removing the tab. Do not remove the tab until the sidebar search is confirmed working.

---

## Risk 6: `SidebarTreeNode` search in NotesTab

**Evidence:** `SidebarTreeNode` in `NotesTab.tsx` does not currently accept a `searchQuery` prop. `DocsFilesTab.tsx` has `nodeMatchesSearch()` and `TreeNodeItem` accepts `searchQuery`.

**Risk:** Implementing the same logic in NotesTab requires adding `searchQuery` prop to `SidebarTreeNode` and `nodeMatchesSearch()` function. These are copy-pasteable from DocsFilesTab but must be done correctly or the tree rendering breaks.

**Mitigation:** Extract `nodeMatchesSearch` to `src/lib/garden/notesApi.ts` or a new `src/lib/garden/treeUtils.ts` and import in both components. This avoids duplication.

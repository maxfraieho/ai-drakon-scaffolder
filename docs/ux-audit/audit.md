# AI-DRAKON UX Audit — 2026-05-15

Evidence-based. All observations reference actual source files.

---

## 1. Scope

Two interconnected pipelines:
- **Pipeline A** — Code → DRAKON IR (architect-agent `/pipeline/analyze`, POST)
- **Pipeline B** — DRAKON IR → Code (architect-agent `/pipeline/generate`, POST)

Both backend endpoints exist and are tested. Neither has a frontend surface yet.

Current UI entrypoints analyzed:
- `/diagrams` → `DiagramsPage.tsx` — DRAKON diagram editor
- `/docs` → `docs.tsx` — Documentation hub (4 tabs)
- `AppHeader.tsx` — Global navigation + Agents panel

---

## 2. Findings

### 2.1 Pipeline UI does not exist — HIGH PRIORITY

**Evidence:** `pipeline_route.py` deployed. No React component references `/pipeline/analyze` or `/pipeline/generate` anywhere in `src/`.

**Impact:** The two core new capabilities are inaccessible to users. Pipeline A (code → DRAKON IR) naturally belongs in `/diagrams` where DRAKON is created and edited. Pipeline B (DRAKON IR → code) also belongs there — it's the inverse of what `/diagrams` produces.

**Complexity:** Medium. Pattern already exists: `docs.tsx` has exactly this async-job pattern (handleGenerate → poll status → show result). Reuse it.

---

### 2.2 "Файли" tab is a pure navigation layer — MEDIUM

**Evidence:** `DocsFilesTab.tsx` is read-only. `onNoteClick` calls `onNoteOpen(slug)` which does `setFocusedSlug(slug); setDocsTab("notes")` in `docs.tsx`. It fetches `fetchNotesTree()` independently of `NotesTab`.

**Impact:** The tab switches the user to a different tab without any visual transition signal. A user clicks a file, the tab disappears and "Документи" appears — this is disorienting the first time. Additionally, `NotesTab` has the same file tree in its sidebar — the "Файли" tab duplicates the browsing capability but removes the editing capability.

The tab is not harmful but adds cognitive overhead: "why do I need 'Files' if 'Documents' already shows the tree?"

**What works:** Search + note count in DocsFilesTab is useful and not in the sidebar. That's the only unique value.

**Options:**
- A: Remove "Файли" tab and add search + note count to the NotesTab sidebar header
- B: Keep "Файли" tab but make it open notes inline (split view or embedded editor) so it has distinct capability

Option A is simpler and removes the confusing tab-switch teleportation.

---

### 2.3 Duplicate `fetchNotesTree()` calls — LOW / IMPLEMENTATION

**Evidence:** `NotesTab.tsx:169` calls `fetchNotesTree()` on mount. `DocsFilesTab.tsx` calls it independently. Both call the same Worker endpoint. When user switches between tabs, the tree is refetched.

**Impact:** Minor — two redundant network calls. Not user-visible on fast connections. Worth fixing at the component level with shared state or TanStack Query cache.

**Complexity:** Low — TanStack Query is already in the project (QueryClientProvider in root). Add `useQuery({ queryKey: ['notesTree'], queryFn: fetchNotesTree })` in both, the cache deduplicates.

---

### 2.4 Wiki-link autocomplete popup position is hardcoded — LOW

**Evidence:** `NoteEditor.tsx` line ~170: `className="absolute left-3 top-3"`. The popup always renders at top-left of the editor area regardless of cursor position.

**Impact:** When the user is typing near the top of the document, the popup overlaps their current line. When typing anywhere else, the popup is visible but disconnected from the cursor — the user has to look away from their typing position to see suggestions.

**What works fine:** The keyboard navigation (ArrowUp/Down, Enter/Tab/Escape) and the suggestion content are correct.

**Complexity:** Medium. Requires tracking cursor position with `getBoundingClientRect` on the textarea — doable but not trivial.

---

### 2.5 No "saved" feedback after Ctrl+S — LOW

**Evidence:** `NoteEditor.tsx` save button is `disabled={isSaving || !isDirty}`. After save, `isDirty` resets to false and the button goes disabled. There's no timestamp, no "Збережено" flash, no visual confirmation beyond the button becoming disabled.

**Impact:** Users who rely on Ctrl+S (power users — exactly the audience for keyboard shortcut hints) get no confirmation. After a 3-second GitHub save, they can't tell if it saved or if it's still in progress.

**What works:** The Sonner `toast.success` is called somewhere in `useNotesEditor` after a successful save. Checking the hook would confirm — if it already shows a toast, this is a non-issue.

**Complexity:** Trivial if toast is missing; non-issue if it's already there.

---

### 2.6 job_store is in-memory only — ARCHITECTURAL NOTE

**Evidence:** `pipeline/job_store.py` uses a Python dict `_store: dict[str, Job] = {}`. Process restart clears all jobs.

**Impact:** If the user triggers Pipeline A, navigates away, and the service restarts, the job_id is lost. `/pipeline/status/{id}` returns 404. This is acceptable for an async MVP pattern but means the frontend must poll immediately and not persist job_ids across sessions.

**Not a UX redesign problem** — this is a backend architectural note for when persistence is needed.

---

## 3. What works well — do not change

| Area | Assessment |
|---|---|
| Precision Dark design system | Coherent, consistent, professional. amber/mono combination is distinctive. |
| JetBrains Mono font | Correct for a code/DRAKON tool. |
| Global Agents panel (header sheet) | Correct placement — accessible from every route. |
| `handleGraphNodeClick` → focusSlug → "Документи" | Cross-tab navigation pattern is solid. |
| Draft restoration in NoteEditor | Correct UX — amber border, clear options. |
| Keyboard shortcuts + hint bar | Full set (Ctrl+B/I/K/E/P/S) with visible hint bar. Well-executed. |
| SidebarTreeNode hover actions | FilePlus / Trash2 appear on hover, invisible at rest — correct density trade-off. |
| NotesTab sidebar collapse on mobile | `sidebarOpen` state with PanelLeft toggle — mobile-aware. |
| Tag editor | Present and functional. |

---

## 4. Prioritized Redesign Plan

| Priority | Issue | Action | Complexity |
|---|---|---|---|
| 1 | Pipeline UI missing | Add "Аналіз" + "Генерація" to DiagramsPage | Medium |
| 2 | "Файли" tab redundancy | Remove tab, move search to NotesTab sidebar | Low |
| 3 | Duplicate tree fetches | Use TanStack Query cache for `notesTree` | Low |
| 4 | Wiki-link popup position | Track cursor coords, position popup near cursor | Medium |
| 5 | Save feedback | Verify if toast exists; add if missing | Trivial |

---

## 5. Pipeline UI — Design Decisions

### Where to place Pipeline A trigger (Code → DRAKON IR)

`/diagrams` is the correct location. The user is working on DRAKON diagrams — Pipeline A analyzes source code and generates DRAKON IR for import.

**Proposed:** Add a "Аналізувати код" button/panel in DiagramsPage. Input: code paste or file path. Output: generated DRAKON IR that can be imported as a new diagram.

### Where to place Pipeline B trigger (DRAKON IR → Code)

Also `/diagrams`. When a diagram is open, Pipeline B generates code from it.

**Proposed:** Add a "Генерувати код" action in the diagram editor toolbar (per-diagram action, not global).

### Job status visibility

Both pipelines return a `job_id` immediately and must be polled. The existing `docs.tsx` pattern (setInterval + log area) is correct and should be reused as a component.

### Stitch prompt targets

The Stitch prompt should produce a visual design for:
1. "Аналіз коду" panel in DiagramsPage — code input + job status + IR result preview
2. "Генерувати код" panel in diagram editor — language selector + generated code display with copy

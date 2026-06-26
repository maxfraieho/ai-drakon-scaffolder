[LOVABLE PROMPT — UI-OPT-LAYOUT-CLEAN]

Optimize the layout, sidebar, and settings system to transition the application fully to the new Project Hub architecture (Option A).

### 1. SIDEBAR & LAYOUT CLEANUP (Double Sidebar Elimination)
Modify `src/components/workspace/WorkspaceShell.tsx`:
- Detect if we are on a clean view page: `const isCleanView = location.pathname === '/' || location.pathname.startsWith('/p/');`
- If `isCleanView` is true:
  - Do NOT render the left `IconRail` or the main Workspace sidebar (`NAV_WORKSPACE` and `NAV_SYSTEM`).
  - Let the content occupy 100% of the screen width (plus `ProjectSidebar` rendered inside `ProjectLayout` on `/p/*` pages).
- If on `/` (Projects list page):
  - Render a clean top header bar with:
    - Logo: "AI-DRAKON"
    - Theme toggle (Sun/Moon)
    - Logout button (LogOut icon with confirm dialog)
    - Command palette trigger (⌘K)
- If on `/p/$slug/*` (Project Hub pages):
  - Completely hide the `WorkspaceShell`'s top header bar, sidebar, and icon rail to prevent redundancy and double headers.
  - The page will be wrapped entirely by `ProjectLayout`.

Modify `src/layouts/ProjectLayout.tsx`:
- Since the global header is hidden on `/p/*` pages, add the global controls to `ProjectLayout`'s header:
  - Add theme toggle button (Sun/Moon).
  - Add logout button (LogOut icon with confirm dialog).
  - Add the Agent Chat sheet trigger (Bot icon) to open the `AgentChatPanel` sidebar. Use a Sheet component like the one from WorkspaceShell to slide it in from the right.
  - Add Command palette trigger (⌘K) to open the `CommandPalette`.

### 2. ROUTE CLEANUP & REDIRECTS
In TanStack Router route files, redirect legacy/obsolete pages to the home page `/`:
- Files to modify:
  - `src/routes/pipelines.tsx`
  - `src/routes/diagrams.tsx`
  - `src/routes/sync.tsx`
  - `src/routes/github.tsx`
  - `src/routes/codegen.tsx`
  - `src/routes/workspace.tsx`
  - `src/routes/architect.tsx`
  - `src/routes/code.tsx`
  - `src/routes/knowledge.tsx`
  - `src/routes/notebooks.tsx`
  - `src/routes/observability.tsx`
- Replace their route implementation to throw a redirect:
  ```typescript
  import { createFileRoute, redirect } from "@tanstack/react-router";

  export const Route = createFileRoute("/pipelines")({
    beforeLoad: () => {
      throw redirect({ to: "/" });
    },
  });
  ```

### 3. SETTINGS UNIFICATION
- Modify `src/routes/p.$slug.settings.tsx`:
  - Import the functional `SettingsPage` component from `@/pages/SettingsPage`.
  - Render `SettingsPage` inside the route.
- Modify `src/routes/settings.tsx`:
  - Replace the entire inline 1300-line `SettingsRoute` component.
  - Import and render `SettingsPage` from `@/pages/SettingsPage`.
- Update `src/pages/SettingsPage.tsx` to handle project-scoped settings:
  - If loaded under `/p/$slug/settings`, pre-fill and write config scoped to the active project (using `useProjectLayout()` or slug params).
  - Keep the global/local storage settings as fallback if no active project slug is detected.

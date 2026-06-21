Please perform a comprehensive verification of the user interface, routing, and core features for all tasks from TASK-DRK-1 to TASK-DRK-11.

Follow this checklist to confirm everything works properly:

### 1. Project Creation & Starter Interview (TASK-DRK-11)
- Navigate to `/project/new` (or click "Створити з AI (Документознавець)" in the Project Selector modal).
- Verify you can connect to GitHub, search or input a repository, select the target language (JavaScript or Lua), and enter the project title/description.
- Verify the interview chat with the Docs Agent works: sending messages receives answers from the Docs-Agent.
- Click "Завершити інтерв'ю & Створити проект" and verify the scaffolding progress screen correctly displays the step-by-step progress:
  1. Registry configuration
  2. Domain model docs generation
  3. Scaffolding diagrams and `solution.json`
  4. Redirection to `/diagrams`

### 2. Workspace & File Tree (TASK-DRK-5)
- In the active workspace sidebar, verify that the project's file tree correctly lists files and directories (especially `.drakon` diagrams, `.js`/`.lua` code, and `.md` files).
- Click on different files and ensure they open in the correct editor view.

### 3. DrakonWidget & Canvas Rendering (TASK-DRK-2)
- Open a `.drakon` diagram file.
- Verify that the React canvas wrapper loads and renders the DrakonWidget diagrams cleanly.
- Verify zoom-in, zoom-out, and panning controls work correctly.

### 4. Dynamic Script Loading (TASK-DRK-3)
- Verify that scripts `/drakontechgen.js`, `/drakongen.js`, `/esprima.js`, `/escodegen.browser.min.js`, and `/luaparse.js` are loaded dynamically only when navigating to a diagram editor page.

### 5. Client-Side Compilation (TASK-DRK-4)
- Modify a node or make changes inside a diagram.
- Ensure that saving the diagram triggers client-side compilation using `drakontechgen.buildGenerator` and outputs the compiled Javascript or Lua code instantly.

### 6. GitHub Integration & Commit (TASK-DRK-6)
- Save edits to a `.drakon` file and verify it triggers a git commit through the GitHub API, saving both the `.drakon` file and its compiled code counterpart.

### 7. Validation of Drakon Diagrams (TASK-DRK-9)
- Introduce a layout error on the diagram (e.g., an orphan node or a conditional node without one of its branching transitions).
- Verify that saving or committing the diagram displays appropriate validation errors and halts compilation or saves, as configured.

### 8. Silent JWT Refresh (TASK-DRK-10)
- Verify that the frontend background client automatically refreshes the Appwrite JWT tokens silently without interrupting the developer workspace session, preventing 15-minute token expirations.

### 9. Docs-Agent and Architect-Agent Backend APIs (TASK-DRK-7, TASK-DRK-8)
- Verify that the frontend successfully communicates with:
  - `/docs/domain` endpoint to generate `domain.md` from the interview transcript.
  - `/projects/{slug}/scaffold` endpoint to create the initial skeletal diagrams and `solution.json` configuration.

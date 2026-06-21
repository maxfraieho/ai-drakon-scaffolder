Please synchronize the workspace files from the `.lovable/` folder into your active development/runtime environment.

We have completed the implementation of "TASK-DRK-11: UI стартового інтерв'ю для нових проектів (/project/new)". The following files have been created or modified:
1. `src/components/workspace/ProjectSelector.tsx` — updated to include a link "Створити з AI (Документознавець)" with a Sparkles icon, leading to `/project/new`.
2. `src/routes/project.new.tsx` — route definition for `/project/new`.
3. `src/pages/ProjectNewPage.tsx` — page implementation (starter interview chat with Docs-Agent, repository configuration, target language selector, and generation progress indicators).

Please perform the following steps:
1. Check the contents of the modified files in `.lovable/src/` and apply them to your active sandbox's `src/` directory.
2. Regenerate the TanStack Router route tree (`npx @tanstack/router-cli generate`) so that the `/project/new` route is active and resolved.
3. Verify that the application compiles successfully without any TypeScript or bundling errors.
4. Verify the UI by ensuring:
   - The "Створити з AI (Документознавець)" button is visible in the project management dialog.
   - Clicking it navigates to `/project/new`.
   - The starter interview interface loads, renders the chat area, and lets the user select programming languages (JavaScript/Lua) and connect to GitHub.

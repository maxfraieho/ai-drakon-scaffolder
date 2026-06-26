You are an expert React/TypeScript developer using Tailwind CSS, shadcn/ui, and @tanstack/react-router.

Your task is to perform a **precision refactor** on **`src/pages/AgentStudioPage.tsx`** to make it context-aware of the project slug and agent ID.

---

## Refactoring Guidelines
- **CRITICAL**: Do NOT modify or rewrite the inner canvas elements or DrakonEditor components. Focus solely on the surrounding layout wrapper, headers, toolbars, and integration logic.
- Ensure proper mirroring by saving/editing files in both `src/` and `.lovable/src/`.

---

## Modifications Required in `src/pages/AgentStudioPage.tsx`

### 1. Route Parameter Integration
- Replace local state-based selection logic with URL parameters:
  - Extract the `slug` (project slug) and `agentId` (agent diagram name) using:
    ```typescript
    const { slug, agentId } = useParams({ from: '/p/$slug/agents/$agentId/studio' });
    ```
  - Initialize the state `selectedPipelineName` with `agentId` by default so that the studio automatically loads the corresponding diagram when mounted.

### 2. Header and Navigation updates
- Add a breadcrumb-style navigation bar at the top of the studio page:
  - Navigation path: `Projects` (links to `/`) > `[Project Name]` (links to `/p/${slug}/overview`) > `Agents` (links to `/p/${slug}/agents`) > `Studio`
  - Explicitly include a "← Back to Agents" navigation link near the agent name.
- Display a deployment status badge next to the agent name in the header:
  - `deployed` -> Green Badge "● Live"
  - `draft` -> Yellow Badge "● Draft"
  - `error` -> Red Badge "● Error"

### 3. Runtime Target Selection
- Create a new component **`src/components/agents/RuntimeTargetToggle.tsx`** (and `.lovable/src/components/agents/RuntimeTargetToggle.tsx`):
  - Render a segmented toggle pill (Cloudflare Flue vs Vercel EVE):
    - Target `flue` -> Label: "Flue ☁"
    - Target `eve` -> Label: "EVE ▲"
- Add this `RuntimeTargetToggle` to the right side of the top toolbar in `AgentStudioPage.tsx`.
- Manage toggle state:
  ```typescript
  const [runtimeTarget, setRuntimeTarget] = useState<'flue' | 'eve'>('flue');
  ```
- **Context Banner**:
  - If `runtimeTarget === 'eve'`, display a modern fuchsia/violet information banner below the toolbar:
    "EVE target selected. Output compilation will generate Vercel EVE filesystem structure (agent/)."

### 4. Target-Specific Compilation and Deployment Flow
- If `runtimeTarget === 'flue'`:
  - Keep the default deployment buttons/logic unchanged.
- If `runtimeTarget === 'eve'`:
  - Change the Deploy button label in the toolbar from "Deploy to Cloudflare" (or Run) to "Compile for EVE".
  - When the user clicks "Compile for EVE", make a `POST` request to the backend worker's ZIP endpoint `/v1/architect/compile-eve/zip` with the body:
    ```json
    {
      "ir": currentDrakonIR,
      "projectId": slug,
      "projectName": agentId
    }
    ```
    - The endpoint returns `Content-Type: application/zip` containing the bundled files. Trigger a direct file download for the compiled ZIP archive: `${agentId}-eve-agent.zip`.
    - Present a success toast: "EVE agent filesystem compiled and downloaded successfully!"

---

## Files to Create/Modify
- Create **`src/components/agents/RuntimeTargetToggle.tsx`**
- Refactor **`src/pages/AgentStudioPage.tsx`**
*(Ensure all created/modified files are mirrored to `.lovable/src/...` to keep dev-sync active!)*

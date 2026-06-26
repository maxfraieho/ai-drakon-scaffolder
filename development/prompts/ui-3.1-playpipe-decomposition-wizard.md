You are an expert React/TypeScript developer using Tailwind CSS, shadcn/ui, react-hook-form, zod, and @tanstack/react-query.

Your task is to implement the **PlayPipePage** at `/p/$slug/playpipe`. This page decomposes an application description into components, each managed by a dedicated builder agent.

---

## Visual & Design Guidelines
- Make a premium, dark-mode-first glassmorphic two-panel interface:
  - **Left Panel (40%)**: DecompositionWizard and component list editor.
  - **Right Panel (60%)**: Component Dependency Graph visualizer (displays the components in a clean, interactive flowchart/node-based layout).
- Utilize lucide-react icons for UI controls and badges:
  - `Sparkles`, `Loader2`, `Plus`, `Trash`, `Play`, `ArrowRight`, `Bot`.

---

## Implementation Details

### 1. Left Panel — DecompositionWizard

- **Phase A: Empty State**:
  - Render a large textarea with placeholder: "Describe the application you want to build in detail..."
  - Button `[Decompose into Components]` (disabled if input length < 30).
- **Phase B: Loading State**:
  - Show a modern skeleton list with a spinner and loading message: "Architect agent is analyzing your application structure..."
- **Phase C: Components List**:
  - Render an editable list of component cards. Each component card has:
    - **Name**: Inline editable input.
    - **Description**: Inline editable textarea.
    - **Status Badge**:
      - `pending` (gray)
      - `has-agent` (blue)
      - `building` (yellow)
      - `done` (green)
    - **Actions**:
      - `[Assign Agent]`: Opens the `NewAgentWizard` modal pre-filled with the component name and description. On wizard completion, update status to `has-agent`.
      - `[Delete]`: Shows inline confirmation before removal.
  - Below list controls:
    - `[+ Add Component]` button: Appends a new blank component card and focuses its name input.
    - `[Start PlayPipe Build]` button: Triggers the build sequence. Disabled until **all** components have an assigned agent (`has-agent` status).

### 2. Right Panel — Component Graph Visualizer
- Implement a modern flowchart flow layout rendering the `componentsQueue` as connected node blocks.
- If a component has an agent assigned, display a Bot icon and a blue border glow.
- Connect the component nodes using simple visual connector lines or SVG arrows representing the build pipeline dependency.

---

## Technical Integration & API Calls

### 1. Decomposition request
When the user triggers the decomposition, call the backend endpoint `POST /v1/architect/decompose` (proxied by the worker to the LangGraph architect-agent service) with body:
```json
{
  "appDescription": "..."
}
```
- The response returns a list of components:
```json
{
  "success": true,
  "components": [
    { "name": "Auth API", "description": "Handles login and jwt auth" },
    ...
  ]
}
```
- If the request fails, show an inline error alert: "Decomposition failed. Try manually entering components." and show an `[Add Component Manually]` button to skip directly to Phase C.

### 2. Start PlayPipe Build
When the user clicks `[Start PlayPipe Build]`, call the backend endpoint `POST /v1/architect/build-parallel` with body:
```json
{
  "components": [
    { "name": "...", "description": "...", "agentId": "..." }
  ]
}
```
- This returns a `buildId` (string). On success, navigate the user to `/p/${slug}/playpipe/build?buildId=${buildId}`.

---

## Files to Create/Modify
- Create **`src/pages/PlayPipePage.tsx`** (containing layout, state, and visual graph).
- Create **`src/components/playpipe/DecompositionWizard.tsx`**
- Create **`src/components/playpipe/ComponentCard.tsx`**
- Modify **`src/routes/p.$slug.playpipe.tsx`** (render `PlayPipePage` instead of the placeholder).
*(Ensure all created/modified files are mirrored to `.lovable/src/...` to keep dev-sync active!)*

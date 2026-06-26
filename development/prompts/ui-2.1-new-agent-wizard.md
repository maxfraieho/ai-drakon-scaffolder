You are an expert React/TypeScript developer using Tailwind CSS, shadcn/ui, react-hook-form, zod, and @tanstack/react-query.

Your task is to implement the **AgentsPage** at `/p/$slug/agents` and the **NewAgentWizard** modal/drawer inside it.

## Visual & Design Guidelines
- Make a premium, dark-mode-first glassmorphic wizard interface inside a Dialog/Drawer.
- Use nice typography, smooth gradients (indigo/violet glow), active states, and transitions.
- Use Lucide icons: `Bot`, `Sparkles`, `Loader2`, `CheckCircle2`, `ArrowLeft`, `ArrowRight`, `Edit2`, `Play`.

---

## Part 1: AgentsPage (`src/pages/AgentsPage.tsx` and `src/routes/p.$slug.agents.tsx`)
- Update `src/routes/p.$slug.agents.tsx` to import and render `AgentsPage` from `src/pages/AgentsPage.tsx`.
- **Agents List**:
  - Fetch the list of agent diagrams for the current project using `@tanstack/react-query` calling the helper `api.listDrakonIr(slug)` from `@/lib/api`.
  - Display the agents in a responsive card grid. Each card displays:
    - Agent Name (e.g. diagram name)
    - Mode/type indicator (Bot icon)
    - A badge for status (e.g. "Draft" or "Live")
  - **Quick Actions on Hover**: Show `[Open in Studio]` and `[Delete]` buttons on the card.
  - Clicking `[Open in Studio]` or the card surface navigates to: `/p/${slug}/agents/${agentName}/studio`.
- **Empty State**:
  - If no agents exist, show a centered empty state: a Bot icon, a heading "No agents created yet", and a prominent `[+ New Agent]` button.
- **Header**:
  - Title: "Project Agents"
  - Subtitle: "Manage agent definitions, prompts, and execution settings."
  - Right-aligned `[+ New Agent]` button (opens `NewAgentWizard` modal/drawer).

---

## Part 2: NewAgentWizard (`src/components/agents/NewAgentWizard.tsx`)
Create a multi-step modal/drawer wizard to generate and save a new AI agent:

### Step 1: Agent Definition
- Inputs:
  - **Agent Name**: Text input (validate: required, min 3 characters, alphanumeric + hyphens only, Zod validated).
  - **Description & Directives**: Textarea. A detailed description of the agent's behavior, responsibilities, and tasks. Validate: required, min 20 characters.
- Action: `[Generate Agent Schema]` button. Disabled if inputs are invalid.

### Step 2: Processing (Loading State)
- Display a modern animated skeleton loader (using shadcn/ui skeleton) with messages like:
  "AI is drafting DRAKON IR schema...", "Validating execution paths..."
- **Async generation**:
  Call the helper `generateDrakonCode` from `@/lib/codegen/codegenApi` (handles the POST to `/v1/codegen` and polling of `/v1/codegen-status`):
  ```typescript
  import { generateDrakonCode } from "@/lib/codegen/codegenApi";

  // Call signature:
  const res = await generateDrakonCode({
    description: descriptionInput,
    language: "JS2604",
    functionName: agentName,
    params: ""
  });
  // Returns: Promise<CodegenResponse> containing drakon_json
  ```
- **Validation**:
  - Once the generated schema is returned, import `validateDrakonIR` from `@/lib/drakon-validator` and run `validateDrakonIR(res.drakon_json)`.
  - If validation returns `true`, transition to Step 3.
  - If validation returns `false` or the API call fails, transition back to Step 1 and render a red error banner: "Invalid schema received from AI. Try refining your description."

### Step 3: Schema Review
- Display a visual outline or summary of the generated schema nodes (e.g., listing the execution steps/actions and questions generated).
- Provide action buttons:
  - `[← Regenerate]`: Returns to Step 1 with description preserved.
  - `[Edit Manually]`: Closes the wizard and opens this agent in the Agent Studio.
  - `[✓ Save Agent]`: Saves the schema.
    - Call the helper `api.saveDiagram(slug, agentName, drakonSchema)` from `@/lib/api`.
    - Once successfully saved, transition to Step 4.

### Step 4: Success State
- Centered glowing checkmark (`CheckCircle2`).
- Text: "Agent created and saved successfully!"
- Button `[Open in Studio]` which navigates to `/p/${slug}/agents/${agentName}/studio`.

---

## Files to Create/Modify
- Create **`src/components/agents/NewAgentWizard.tsx`**
- Create **`src/pages/AgentsPage.tsx`**
- Modify **`src/routes/p.$slug.agents.tsx`** (import and render `AgentsPage`)
- Create **`src/routes/p.$slug.agents.$agentId.studio.tsx`** (route wrapper that renders the existing `AgentStudioPage` component, extracting `slug` and `agentId` parameters).

*(Ensure all created/modified files are mirrored to `.lovable/src/...` to keep dev-sync active!)*

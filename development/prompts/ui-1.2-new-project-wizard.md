You are an expert React/TypeScript developer using Tailwind CSS, shadcn/ui, react-hook-form, zod, and @tanstack/react-query.

Your task is to build a multi-step project creation wizard: NewProjectWizard, and integrate it into the ProjectNewPage.

## Visual and Design Guidelines
- Make a premium, dark-mode-first glassmorphic wizard interface. Use Outfit/Inter typography, smooth gradients (e.g. indigo/violet/fuchsia glow), and subtle borders.
- The wizard must be centered on the page with a clean step indicator (Step 1 -> Step 2 -> Step 3).
- Utilize lucide-react icons for visual identifiers:
  - Bot (Agent System)
  - Package (App / PlayPipe)
  - Workflow (N8N Automation)
  - Github, CheckCircle2, Loader2, ArrowRight, ArrowLeft

## Implementation Details

### Step 1: Name, Description & Mode
- Form Inputs:
  - **Project Name**: Text input. Required. Validate with Zod: `z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters')`.
  - **Project Description**: Textarea. Optional. Max 200 characters.
- **Selectable Mode Cards**:
  - Implement a grid of 3 large selectable option cards (functioning as a radio group but styled with cards, nice icons, and active border glow effects):
    - **🤖 Agent System**: "Build AI agents for specific tasks" (mode: 'agent')
    - **📦 App / PlayPipe**: "Build apps using component agents" (mode: 'playpipe')
    - **🔗 N8N Automation**: "Create workflow automations" (mode: 'n8n')
- **Next Button**: Disabled if current step inputs are invalid.

### Step 2: Repository Configuration (GitHub)
- **Auto-create GitHub repository** (Toggle Switch): Default is `ON`.
  - If `ON`: Show info text: "A new repository will be created under your connected GitHub account."
  - If `OFF`: Show text input for manual GitHub Repository URL (validate with Zod for a valid HTTPS Git URL).
- **GitHub Connection Banner**:
  - If the user's GitHub token or settings are missing or not connected, display a warning banner:
    "Connect GitHub in Settings first to enable auto-creation." with a link to `/settings`.
- **Navigation Buttons**:
  - `[Back]` button to return to Step 1.
  - `[Create Project]` button to trigger the creation flow. Show a loading spinner (`Loader2` rotating) and disable the button while loading is in progress.

### Step 3: Success Screen
- Center a large, glowing green success checkmark (`CheckCircle2` with pulse/scale transition).
- Heading: "Project created successfully!"
- Show details:
  - **Project Name**
  - **Project Mode** (with matching badge/icon)
  - **GitHub Repository URL** (if created/linked)
- **Enter Project Button**: Styled as a prominent primary button, which navigates the user to `/p/{slug}/overview` where `{slug}` is the generated project slug (kebab-cased version of the name, e.g. `my-awesome-project`).

---

## Technical Integration & API Calls

### 1. Repository Creation (GitHub)
If the user keeps "Auto-create GitHub repository" toggle enabled, you must call the `createGithubRepo` helper from `@/lib/github-api` (which resolves the backend API endpoint `/v1/github/create-repo`):
```typescript
import { createGithubRepo } from "@/lib/github-api";

// Arguments: repoName (string), isPrivate (boolean, default true)
// Returns: Promise<CreateRepoResponse>
export interface CreateRepoResponse {
  success: boolean;
  repoUrl: string;
  fullName: string; // e.g. "owner/repo"
  cloneUrl: string;
}
```

### 2. Project Creation (Appwrite / Backend)
Once the repository is configured (either created or manual URL provided), call the `api.addProject(data)` helper from `@/lib/api` (which resolves the backend API endpoint `/v1/projects/add`):
```typescript
import { api } from "@/lib/api";

// Example call structure:
const result = await api.addProject({
  slug: generatedSlug, // kebab-case, lowercase
  name: name,
  path: `/projects/${generatedSlug}`,
  description: description,
  github: githubInfo // optional: { owner: string; repo: string; branch: 'main' }
});
```

### 3. State Management & React Query
- Wrap the project creation flow in a React Query `useMutation` hook.
- Handle potential errors cleanly and render inline error alerts (e.g. `Alert` from shadcn/ui) in Step 2 if any API request fails (e.g., "GitHub Token Error - please link GitHub in Settings", or "Project name already exists"). Avoid using generic toast errors for block-level wizard failures so that the user can correct the input directly on the screen.

### 4. Router Navigation
- Use `useNavigate` from `@tanstack/react-router` for all navigation actions.

---

## Files to Create/Modify
- Create **`src/components/projects/NewProjectWizard.tsx`** containing the wizard layout and implementation.
- Overwrite **`src/pages/ProjectNewPage.tsx`** to import and render `NewProjectWizard`. Ensure proper routing compatibility.

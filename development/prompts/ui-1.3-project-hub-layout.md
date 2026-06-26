You are an expert React/TypeScript developer using Tailwind CSS, shadcn/ui, and @tanstack/react-router.

Your task is to implement the Project Hub Layout and route structure at `/p/$slug`.

## Routing & Route Structure (TanStack Router)
We use TanStack Router with file-based routing. You must create the following route files:
1. **`src/routes/p.$slug.tsx`**: The layout route for `/p/$slug`.
   - It should retrieve the `slug` parameter:
     ```typescript
     const { slug } = useParams({ from: '/p/$slug' });
     ```
   - It should render the layout shell: sidebar, top header, and main content area containing the `<Outlet />` component to render children.
2. **`src/routes/p.$slug.overview.tsx`**: Renders the `/p/$slug/overview` page.
3. **`src/routes/p.$slug.agents.tsx`**: Renders the `/p/$slug/agents` page.
4. **`src/routes/p.$slug.playpipe.tsx`**: Renders the `/p/$slug/playpipe` page.
5. **`src/routes/p.$slug.automations.tsx`**: Renders the `/p/$slug/automations` page.
6. **`src/routes/p.$slug.docs.tsx`**: Renders the `/p/$slug/docs` page.
7. **`src/routes/p.$slug.settings.tsx`**: Renders the `/p/$slug/settings` page.

*(Note: Create corresponding mirrored files in `.lovable/src/routes/` as well!)*

---

## Layout Specifications

### 1. ProjectSidebar Component (`src/components/layout/ProjectSidebar.tsx`)
- Fixed-width sidebar (e.g. `240px` on desktop, adapting to a bottom nav or hamburger menu on mobile).
- Render a list of navigation links using TanStack `<Link>`:
  - **Always show**:
    - **Overview** (Icon: `LayoutDashboard`) -> `/p/${slug}/overview`
    - **Docs** (Icon: `BookOpen`) -> `/p/${slug}/docs`
    - **Settings** (Icon: `Settings`) -> `/p/${slug}/settings`
  - **Show conditionally based on `project.mode`**:
    - If `mode === 'agent'`:
      - **Agents** (Icon: `Bot`) -> `/p/${slug}/agents`
    - If `mode === 'playpipe'`:
      - **PlayPipe** (Icon: `Package`) -> `/p/${slug}/playpipe`
      - **Agents** (Icon: `Bot`) -> `/p/${slug}/agents` (these represent component agents)
    - If `mode === 'n8n'`:
      - **Automations** (Icon: `Workflow`) -> `/p/${slug}/automations`
- **Active State**: The active link must be highlighted visually (e.g. `bg-accent` or an accent border/glow).
- **Loading State**: Render modern skeleton line indicators (using shadcn/ui skeleton) while the project data is fetching.

### 2. Top Header Bar
- Include:
  - **Breadcrumbs**: e.g., `Projects` (navigates back to `/`) > `{project.name}` > `{currentSection}`
  - **GitHub Repository Link**: A small button with the `Github` icon that links to the repository if `project.github` settings (e.g. `repoUrl`) exist.

### 3. Page Placeholders
For each child route (overview, agents, playpipe, automations, docs, settings), implement a beautiful, themed dashboard placeholder containing:
- A title matching the section.
- An card layout demonstrating what is expected there, using Outfit/Inter typography, borders, and modern colors (matching the dark glassmorphic design).
*Example: The Overview page can render the project's details (Mode, description, GitHub connection status, and buttons to other sections).*

---

## Data Fetching & Integration

Use `@tanstack/react-query` to fetch the project details from Appwrite.
- Fetch project data by calling the helper `getProject(slug)` from `@/lib/appwrite-projects` (do not fetch from generic REST if not needed, as `getProject` directly queries Appwrite document store client-side):
  ```typescript
  import { getProject } from "@/lib/appwrite-projects";
  import { useQuery } from "@tanstack/react-query";

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => getProject(slug),
    staleTime: 5 * 60 * 1000,
  });
  ```
- **Error State**: If `isError` or the project is not found:
  - Render a clean, user-friendly full-page error page within the router context: "Project not found" + a button to navigate "Back to Projects" (`/`). Do not crash the layout.

---

## Files to Create/Modify
- Create **`src/components/layout/ProjectSidebar.tsx`**
- Create **`src/layouts/ProjectLayout.tsx`** (or implement layout directly in `src/routes/p.$slug.tsx`)
- Create **`src/routes/p.$slug.tsx`**
- Create **`src/routes/p.$slug.overview.tsx`**
- Create **`src/routes/p.$slug.agents.tsx`**
- Create **`src/routes/p.$slug.playpipe.tsx`**
- Create **`src/routes/p.$slug.automations.tsx`**
- Create **`src/routes/p.$slug.docs.tsx`**
- Create **`src/routes/p.$slug.settings.tsx`**
*(Ensure all created files are mirrored to `.lovable/src/...` to keep dev-sync active!)*

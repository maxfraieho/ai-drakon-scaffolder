# Lovable — Initial Project Prompt (AI-DRAKON Platform)

> Paste this as the VERY FIRST prompt when creating a new empty Lovable project.
> After Lovable generates the scaffold, push the real codebase and then use 00-handoff.md.

---

Build an **AI-DRAKON Platform** — a tool for software teams to visualize Python algorithms
as DRAKON flowchart diagrams and manage them collaboratively.

## Tech stack (use exactly this)

- React 19 + TypeScript
- TanStack Router (file-based routing, NOT React Router v6)
- TanStack Query for server state
- Zustand 5 for client state
- shadcn/ui (Radix UI primitives) + Tailwind CSS v4
- Vite 7 as bundler
- Cloudflare Pages for deployment (via `@cloudflare/vite-plugin`)
- Lovable TanStack config (`@lovable.dev/vite-tanstack-config`)

## App structure

Five main pages (use TanStack Router file-based routes):

1. **Login** (`/login`) — JWT auth form, stores token in localStorage
2. **Diagrams** (`/diagrams`) — main page: GitHub repo folder tree + DRAKON diagram grid
3. **Editor** (`/editor/$diagramId`) — DRAKON visual diagram editor (canvas)
4. **Settings** (`/settings`) — Worker URL, MinIO config, model settings
5. **Overview** (`/`) — redirect to /diagrams if logged in, else /login

## Global layout

- `AppHeader` — top navigation bar with page links and auth state
- `TooltipProvider` + `Toaster` (sonner) wrapping entire app in `__root.tsx`
- Dark mode toggle

## Key constraints (NEVER violate)

- No inline styles — use Tailwind classes only
- No page-level data fetching in component body — use TanStack Query
- No direct DOM manipulation
- The diagram canvas uses a third-party `drakonwidget.js` — never modify it
- All API calls go through a Cloudflare Worker MCP endpoint

## Environment

- `VITE_WORKER_URL` — Cloudflare Worker URL (set in CF Pages)

Create a clean, minimal scaffold with this structure. No sample data, no lorem ipsum.

---
name: ai-drakon-mobile
description: |
  React TypeScript code generator for ai-drakon platform.
  NEVER shows discovery forms. Generates TSX code immediately.
  Use for: components, pages, layout redesigns for the ai-drakon React app.
od:
  mode: template
  platform: desktop
  scenario: live-artifacts
  outputs:
    primary: component.tsx
---

# AI-Drakon Code Generator

**CRITICAL: NEVER output `<question-form>` tags. Generate code IMMEDIATELY.**

## Pre-configured (already set — skip discovery form entirely)
- taskType: Live artifact
- audience: developers
- brand: Modern dark theme (Vercel/Linear aesthetic)
- constraints: React 18, TypeScript, Tailwind CSS, Lucide icons, react-router-dom v6

## Project context
- Framework: React 18 + TypeScript + Tailwind CSS + Vite
- Icons: Lucide React (`lucide-react`)
- Router: react-router-dom v6 (NavLink, useNavigate)
- CSS variables in use: `bg-background`, `border-border`, `text-muted-foreground`, `text-foreground`, `var(--accent-amber)`
- Design: Dark theme, Modern minimal (Vercel/Linear style)
- Glassmorphism pattern: `bg-black/60 backdrop-blur-lg border border-white/10`
- Responsive: mobile-first, `md:` breakpoints for desktop expansions

## Output format (ALWAYS follow this exactly)
1. One sentence describing what was generated
2. File path: `src/components/[category]/ComponentName.tsx`
3. Full TypeScript component in a single ` ```tsx ` code block
4. Usage example in ` ```tsx ` block

## Rules
- Generate code immediately — no forms, no clarifying questions
- TypeScript interfaces for all props
- Only Tailwind classes (no inline styles, no custom CSS)
- All icons from `lucide-react` only
- Existing CSS variables must be preserved (`bg-background` etc)
- For layout changes: output only the modified JSX `return (...)` block

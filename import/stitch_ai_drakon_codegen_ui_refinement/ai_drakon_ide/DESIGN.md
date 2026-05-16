---
name: AI-DRAKON IDE
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b4b4'
  tertiary: '#8fd5ff'
  on-tertiary: '#00344a'
  tertiary-container: '#1abdff'
  on-tertiary-container: '#004966'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 1px
  margin-sm: 8px
  margin-md: 16px
  panel-padding: 12px
---

## Brand & Style
The design system is engineered for a high-performance integrated development environment. The brand personality is clinical, precise, and uncompromisingly technical, catering to an audience that demands high data density and visual focus.

The design style is **Modern Technical Minimalism** with a focus on structural integrity. It utilizes a near-black palette to minimize eye strain during long sessions, contrasted with sharp amber accents to highlight critical AI insights and logic flows. The aesthetic avoids all unnecessary ornamentation, relying on strict alignment, consistent monospaced rhythm, and subtle tonal shifts to define hierarchy. The emotional response is one of total control and clarity within a complex information space.

## Colors
The palette is rooted in a deep "Obsidian" scale to maintain high contrast without the vibration of pure white on black. 

- **Primary (Amber):** Reserved strictly for actionable intelligence, logic state changes, and primary call-to-actions.
- **Backgrounds:** A three-tier system (`base` for the editor, `surface` for sidebars/panels, and `elevated` for floating menus) creates depth through value rather than shadows.
- **Borders:** Used as the primary method of separation. `border-subtle` for internal list items and `border-default` for major architectural boundaries.
- **Text:** Contrast is managed through opacity to ensure readability across all background tiers while maintaining a cohesive gray-scale harmony.

## Typography
This design system employs a single-family monospaced typographic scale using **JetBrains Mono**. This reinforces the "code-first" nature of the IDE. 

- **Alignment:** All text must align to a strict baseline grid to maintain the "block" feel of terminal interfaces.
- **Hierarchy:** Established through weight and opacity rather than significant size shifts.
- **Labels:** Small-caps or high-tracking uppercase labels are used for utility headers and metadata to distinguish them from editable code or content.
- **Mobile:** Typography remains consistent on mobile; however, sidebars collapse into drawers to preserve the line-length of the code view.

## Layout & Spacing
The layout follows a **Fixed-Modular Grid** system. The IDE is divided into logical "Panes" (Explorer, Editor, Terminal, Inspector). 

- **Grid:** Use 1px "gutters" (borders) to separate panes, mimicking a tiled window manager.
- **Density:** High density is preferred. A 4px base unit controls all internal padding and margins.
- **Layout Behavior:** The Editor pane is fluid, while side-panels have fixed widths (e.g., 240px or 320px) to ensure code readability isn't compromised. 
- **Breakpoints:** On desktop, panes are side-by-side. On tablet, secondary panes become toggleable overlays. On mobile, a single-pane focus mode is enforced.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layering** and **Outline Definition** rather than traditional shadows.

- **Stacking:** The further "forward" an element is (e.g., a dropdown or modal), the lighter its background hex value becomes (`bg-elevated`). 
- **Overlays:** Modals and floating tooltips use `bg-overlay` (a subtle white tint) and a `border-default` to separate themselves from the content below.
- **Glassmorphism:** Reserved exclusively for non-modal transient states like "Ghost Text" or "Intellisense" hints, using a slight backdrop blur to maintain legibility over complex code.

## Shapes
The shape language is dominated by sharp, 90-degree corners to maximize screen real estate and echo the structure of a grid. 

- **Base Radius:** A universal **3px radius** is applied to buttons, input fields, and panels to prevent the UI from feeling aggressive while maintaining its technical edge.
- **Large Elements:** Cards and Modals follow the same 3px rule.
- **Interactive States:** Focus states are indicated by a 1px solid `accent-amber` border with no offset, reinforcing the precise nature of the tool.

## Components
- **Buttons:** Primary buttons use a solid `accent-amber` background with black text. Secondary buttons are transparent with a `border-default` and `text-primary`.
- **Inputs:** Fields use `bg-base` with a `border-subtle`. On focus, the border changes to `accent-amber`.
- **Chips/Tags:** Monospace labels inside a `bg-elevated` container with a 2px radius. Used for git branches or language indicators.
- **Lists:** Active list items (e.g., selected file in Explorer) use a subtle `bg-overlay` and a 2px left-accent border in `accent-amber`.
- **Cards:** Used only in the "Welcome" or "Project Selection" screens. They feature `border-default` and no shadows.
- **Status Bar:** A fixed 24px height bar at the bottom using `bg-elevated` and `text-muted` for background tasks and `accent-amber` for errors.
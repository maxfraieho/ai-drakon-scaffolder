---
name: Kinetic Logic
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#303034'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#c4c6d0'
  on-secondary: '#2d3038'
  secondary-container: '#44474f'
  on-secondary-container: '#b3b5be'
  tertiary: '#8fd5ff'
  on-tertiary: '#00344a'
  tertiary-container: '#1abdff'
  on-tertiary-container: '#004966'
  error: '#ef4444'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#e0e2ec'
  secondary-fixed-dim: '#c4c6d0'
  on-secondary-fixed: '#191c23'
  on-secondary-fixed-variant: '#44474f'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
  bg-base: '#0a0b0e'
  bg-surface: '#111318'
  bg-elevated: '#191c23'
  border-subtle: rgba(255,255,255,0.06)
  border-default: rgba(255,255,255,0.10)
  text-primary: rgba(255,255,255,0.92)
  text-secondary: rgba(255,255,255,0.55)
  text-muted: rgba(255,255,255,0.28)
  success: '#22c55e'
  accent-amber-dim: rgba(245,158,11,0.15)
typography:
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  mono-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
spacing:
  unit: 4px
  gutter: 8px
  margin: 16px
  panel-padding: 12px
  input-height: 28px
---

## Brand & Style

The design system is engineered for high-performance technical environments where clarity, density, and precision are paramount. The target audience consists of developers, data engineers, and technical operators who value information density over visual flair.

The design style is **Minimalist-Technical**. It rejects decorative elements like gradients, shadows, and glows in favor of a flat, rigorous interface. The aesthetic is inspired by command-line interfaces and professional hardware consoles, evoking feelings of control, reliability, and surgical efficiency. Every visual mark serves a functional purpose, utilizing strict grid alignment and subtle borders to define spatial relationships.

## Colors

This design system utilizes a deep, monochromatic dark-mode foundation to reduce eye strain during prolonged sessions. The color hierarchy is built on opacity layers rather than distinct hues, ensuring a cohesive and "integrated" feel.

- **Primary Accent:** Amber (#f59e0b) is used sparingly for interactive states, call-to-actions, and status indicators that require immediate attention.
- **Surface Tiers:** Use `bg-base` for the lowest level (e.g., the main application backdrop), `bg-surface` for primary panels, and `bg-elevated` for floating elements like menus or popovers.
- **Borders:** Instead of shadows, use `border-default` and `border-subtle` to define the edges of UI components.
- **Text:** High-contrast white at 92% opacity ensures maximum readability without the harshness of pure white (#FFFFFF).

## Typography

Typography focuses on legibility at small sizes. The scale is intentionally tight to facilitate high-density layouts.

- **UI Text:** Use IBM Plex Sans for all interface labels, buttons, and standard body text. It provides a systematic, professional feel.
- **Code & Data:** Use JetBrains Mono for data values, logs, code blocks, and metadata labels. The monospaced nature helps in scanning vertical columns of information.
- **Hierarchy:** Rely on weight and color (Text Secondary vs. Primary) rather than massive size differences to distinguish hierarchy. Most text stays within the 11px to 13px range.

## Layout & Spacing

The layout model is a **Fluid-Technical Grid** based on a 4px base unit. 

- **Density:** Components are packed tightly. Use 8px (gutter) for spacing between related elements and 16px (margin) for spacing between major sections or panels.
- **Fixed Panels:** While the overall layout is fluid, sidebars and property inspectors should have fixed widths (e.g., 240px or 320px) to maintain a predictable environment for tools.
- **Reflow:** On mobile devices, panels stack vertically. However, the system is primarily optimized for desktop use cases where complex data manipulation occurs.

## Elevation & Depth

This design system explicitly rejects the use of shadows. Depth is communicated through **Tonal Layering** and **Line-Work**:

1.  **Tiers:** Layers are differentiated by their background hex values (Base > Surface > Elevated).
2.  **Borders:** Every panel or "window" must have a 1px solid border using `border-default`. 
3.  **No Blurs:** Avoid backdrop blurs. If a modal or popover is active, use a solid 50% black overlay (`#00000080`) to dim the background.
4.  **Active States:** Interactive depth is indicated by a color change (e.g., a button becomes Amber when active) or a border color shift, rather than a visual "lift."

## Shapes

The shape language is defined by two strict rules:

- **Panels & Containers:** All structural elements (sidebars, main content areas, header bars, cards) use **0px (Sharp)** corners. This reinforces the architectural, grid-based aesthetic.
- **Interactive Controls:** Smaller interactive elements like buttons, input fields, and tags use a **4px (Soft)** radius. This subtle rounding provides a "hit target" hint, differentiating interactive controls from static structural containers.

## Components

### Buttons & Inputs
- **Buttons:** Solid background buttons use `bg-elevated` with a 1px `border-default`. Text should be `text-primary`. Primary actions use a solid Amber background with black text. Height should be exactly 28px for high density.
- **Inputs:** Use `bg-base` with a `border-default`. On focus, the border changes to Amber. No inner shadows.

### Panels & Cards
- Panels have 0px radius and a 1px `border-default`. 
- Headers within panels should use a slightly lighter background (`bg-elevated`) or a bottom-border to separate the title from the content.

### Selection Controls
- **Checkboxes/Radios:** Square (0px) or slightly rounded (2px) boxes. When checked, use a solid Amber fill with a white checkmark icon.
- **Chips/Tags:** Small, 20px height, using `bg-elevated` and `mono-sm` typography.

### Data Displays
- **Lists:** Rows should be 24px-32px high. Use a 1px `border-subtle` for bottom borders between items.
- **Monospace Labels:** Use `label-caps` for table headers or small metadata identifiers to provide a distinct visual break from standard UI text.
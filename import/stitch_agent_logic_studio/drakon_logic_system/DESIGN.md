---
name: Drakon Logic System
colors:
  surface: '#111318'
  surface-dim: '#111318'
  surface-bright: '#37393f'
  surface-container-lowest: '#0c0e13'
  surface-container-low: '#1a1b21'
  surface-container: '#1e2025'
  surface-container-high: '#282a2f'
  surface-container-highest: '#33353a'
  on-surface: '#e2e2e9'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e2e2e9'
  inverse-on-surface: '#2e3036'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#cebdff'
  on-secondary: '#381385'
  secondary-container: '#4f319c'
  on-secondary-container: '#bea8ff'
  tertiary: '#51e77b'
  on-tertiary: '#003915'
  tertiary-container: '#2bca62'
  on-tertiary-container: '#004f20'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005e'
  on-secondary-fixed-variant: '#4f319c'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#111318'
  on-background: '#e2e2e9'
  surface-variant: '#33353a'
typography:
  ui-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  ui-md:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 20px
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
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
  panel-padding: 12px
  element-gap: 8px
  container-margin: 0px
---

## Brand & Style

The design system is engineered for high-density, technical environments where logic visualization and agent orchestration are primary. The brand personality is clinical, utilitarian, and precise—stripping away visual ornamentation to prioritize the structural integrity of data and flow. 

Drawing from **Minimalism** and **Modern IDE** aesthetics, the system utilizes a strict flat-design approach. By eliminating shadows, gradients, and glows, the interface focuses entirely on tonal separation and high-contrast borders to define space. This creates a "glass-box" feel where the logic of the AI agents is transparent, structured, and authoritative.

The target audience consists of AI engineers, systems architects, and logic designers who require an efficient, low-distraction workspace that mimics the efficiency of a terminal or professional code editor.

## Colors

This design system operates on a deep-space dark palette. Hierarchy is established through increasing luminance of the background fills rather than shadows. 

- **Functional Accents**: Amber (#f59e0b) is reserved for primary actions and "state of flux" indicators. Purple (#a78bfa) is specifically designated for decision nodes and conditional logic, providing a distinct visual trigger for branching paths.
- **Tonal Borders**: Subtle alpha-based borders are used to separate panels without creating heavy visual weight.
- **Text Hierarchy**: Contrast ratios are strictly managed using white opacity levels to ensure legibility while maintaining a professional, dimmed-down IDE appearance.

## Typography

The system uses a dual-font strategy to differentiate between the interface shell and the technical data within.

- **IBM Plex Sans**: Used for all standard UI controls, navigation, and primary content. It provides a human-readable, professional structure.
- **JetBrains Mono**: Used for all "technical" elements, including node IDs, logic expressions, file paths, and terminal outputs. This creates a clear mental model: if it's monospaced, it's functional or programmable.
- **High Density Scaling**: Font sizes are intentionally small (11px-13px) to maximize the information density required for complex logic diagrams. Letter spacing is increased on uppercase labels to improve legibility at small scales.

## Layout & Spacing

This design system utilizes a **Fixed-Panel Grid** model typical of high-end IDEs. 

- **The 1px Gutter**: Panels are separated by a 1px border (`border_default`) rather than gaps, creating a seamless "monolithic" layout where the screen is partitioned into functional zones.
- **High Density**: Spacing units are based on a 4px rhythm. Margins are kept to a minimum (0px between major panels) to ensure the logic canvas receives the maximum possible real estate.
- **Panel Reflow**: On smaller viewports, sidebars (Explorer, Inspector) collapse into icons rather than stacking, preserving the horizontal integrity of the diagramming canvas.

## Elevation & Depth

Elevation is communicated strictly through **Tonal Layering**. 

1. **Base Layer (#0a0b0e)**: The global application background and gutter color.
2. **Surface Layer (#111318)**: Primary panels, sidebars, and the main canvas area.
3. **Elevated Layer (#191c23)**: Overlays, modals, and active node states.

There are no shadows. Depth is perceived by the relative brightness of the surface. Hover states use a subtle shift in background color or the introduction of a `border_default` highlight.

## Shapes

The shape language is rigid and architectural.

- **Panel Edges**: 0px radius. Sidebars, headers, and tabs must meet at hard 90-degree angles to maintain the structural IDE look.
- **Interactive Elements**: 4px radius (`rounded-sm`). This applies to buttons, input fields, and chips to provide a subtle affordance of "interactivity" versus "structure."
- **Logic Nodes**: 4px radius for standard nodes; decision diamonds remain sharp.

## Components

### Buttons & Inputs
- **Primary Action**: Amber (#f59e0b) background with black text. No hover glow; use a brightness increase of 10% on hover.
- **Secondary Action**: Transparent background with `border_default`.
- **Inputs**: Fills use `background_base`, borders use `border_default`. Text is `ui-sm`.

### Logic Canvas (Mermaid / Diagrams)
- **Nodes**: Fill with `background_elevated` (#191c23). Borders use `border_default`.
- **Decisions**: Use Purple (#a78bfa) for the stroke or text label.
- **Edges**: 1px solid `text_muted` for standard flows. Use Amber (#f59e0b) with a dashed pattern for active or decision-path edges.

### Panels & Tabs
- **Tab Bar**: 32px height. Active tab has a 2px Amber bottom border and `text_primary`. Inactive tabs use `text_muted`.
- **Explorer Rows**: 24px height. Use `mono-label` for filenames. Hover state uses `background_elevated`.

### Chips & Badges
- **Status Badges**: Small, 10px font size, monospaced. Backgrounds use 15% opacity of the functional color (e.g., Success Green at 15% alpha).
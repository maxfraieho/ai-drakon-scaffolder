---
name: Precision Dark IDE
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
  secondary: '#c3c6d0'
  on-secondary: '#2d3138'
  secondary-container: '#43474f'
  on-secondary-container: '#b2b5be'
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
  secondary-fixed: '#dfe2ec'
  secondary-fixed-dim: '#c3c6d0'
  on-secondary-fixed: '#181c23'
  on-secondary-fixed-variant: '#43474f'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
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
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 16px
  panel-gap: 1px
  toolbar-height: 40px
  sidebar-width: 260px
---

## Brand & Style

The design system is engineered for **AI-DRAKON**, a platform where algorithmic precision meets high-performance engineering. The brand personality is clinical, technical, and authoritative, designed to instill confidence in developers and systems architects. 

The visual style is **Corporate Modern with IDE-inspired density**. It prioritizes information density and functional clarity over decorative flair. The aesthetic utilizes a "Precision Dark" theme: deep obsidian surfaces, ultra-thin hairlines, and tactical hits of amber. The experience should feel like a high-end code editor—low distraction, high efficiency, and immediate responsiveness. No gradients or soft shadows are permitted; depth is achieved solely through tonal layering and hair-line borders.

## Colors

The palette is strictly functional. The **Base (#0a0b0e)** provides the deepest layer, typically reserved for the main workspace background. **Surface** and **Elevated** tiers create the scaffolding for sidebars, toolbars, and panels.

**Amber (#f59e0b)** is used exclusively for primary calls to action, active selection states, and warnings. Its high contrast against the dark background ensures critical paths are never missed. 

**Border Alphas:**
- Low contrast (internal dividers): `rgba(255, 255, 255, 0.06)`
- Medium contrast (standard borders): `rgba(255, 255, 255, 0.10)`
- High contrast (active/hover states): `rgba(255, 255, 255, 0.18)`

## Typography

This design system uses a dual-font strategy to distinguish between UI orchestration and technical content.

- **IBM Plex Sans:** Used for all interface elements, navigation, and primary communication. It offers a structured, engineering-grade feel.
- **JetBrains Mono:** Used for diagram labels, pseudocode, JSON exports, and data-heavy tables.

Typography is intentionally small (11px–13px) to support a high-density IDE layout. Maintain strict adherence to line heights to ensure vertical rhythm in dense property panels.

## Layout & Spacing

The layout follows a **Fixed-Panel Fluid** model. Sidebars and toolbars occupy fixed dimensions, while the central viewport (the DRAKON canvas) expands to fill the remaining space.

A **4px base unit** governs all spacing.
- **High-Density Padding:** Use 4px or 8px for internal component spacing.
- **Panel Separation:** Panels are separated by 1px borders rather than wide gutters to maximize screen real estate.
- **Breakpoints:**
  - *Mobile (<768px):* Sidebars collapse into drawers; toolbars wrap.
  - *Desktop (>1024px):* Multi-pane layout with persistent left/right utilities.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and **Hairline Outlines**. Shadows are strictly prohibited to maintain a "flat" professional IDE aesthetic.

- **Level 0 (Base):** #0a0b0e — The canvas or main background.
- **Level 1 (Surface):** #111318 — Primary UI containers (Sidebars, Toolbars).
- **Level 2 (Elevated):** #191c23 — Hover states or secondary panels.
- **Level 3 (Overlay):** #1e2229 — Modals, dropdown menus, and tooltips.

Every elevation change must be accompanied by a 1px border using the defined alpha values to ensure edge definition between similar dark tones.

## Shapes

The shape language is rigid and disciplined.
- **Standard (4px):** Applied to buttons, input fields, chips, and small component containers.
- **Panels (4-8px):** Main application regions like the file browser or property inspector.
- **Strictly Square:** Nodes within the DRAKON diagram itself should follow the logic of the algorithm (e.g., sharp 90-degree corners for processes, specific angles for decisions).

## Components

### Buttons
- **Primary:** Amber background, black text (#0a0b0e). 4px radius. 
- **Secondary:** Surface-elevated background, white text (92% alpha), 1px border (0.10 alpha).
- **Ghost/Icon:** No background; icon color changes from Muted to Primary white on hover.

### Input Fields
- Dark base background (#0a0b0e) with a 1px border. 
- Focus state: Border changes to Amber (#f59e0b) with no outer glow.
- Placeholder text: Muted white (30% alpha).

### Chips & Tags
- Height: 20px or 24px.
- Background: Surface-overlay (#1e2229).
- Font: JetBrains Mono (11px).

### Lists (File Tree / Property Grid)
- Row height: 28px for high density.
- Selected state: Subtle background tint (#191c23) with a 2px Amber vertical indicator on the left edge.

### Cards & Panels
- No shadows.
- 1px border (0.06 alpha) for containment.
- Header bars: 32px height, Surface-elevated background.
---
name: Precision Dark
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
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
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
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#c5e7ff'
  tertiary-fixed-dim: '#7fd0ff'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6a'
  background: '#111318'
  on-background: '#e2e2e9'
  surface-variant: '#33353a'
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
    lineHeight: 20px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '450'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '450'
    lineHeight: 16px
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
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
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  gutter: 1px
  panel-padding: 12px
---

## Brand & Style

The design system is engineered for software architects and systems engineers who require a high-density, low-distraction environment for complex cognitive tasks. The brand personality is **Technical, Precise, and Stable**. 

The aesthetic is a refined **Minimalist-Industrial** style, characterized by:
- **High Information Density**: Maximizing screen real estate with small, legible typography and tight spacing.
- **Architectural Rigor**: A layout governed by strict logic, utilizing flat panels and subtle 1px borders rather than shadows or gradients.
- **Functional Focus**: Every visual element serves a purpose; decorative flourishes are removed to minimize cognitive load during deep work.
- **Dark-First Intent**: Optimized for long-session viewing in low-light environments, emphasizing readability and structural clarity.

## Colors

This design system employs a tiered grayscale palette to define spatial depth and hierarchy without the use of light-source shadows. 

### Palette Logic
- **Base Layer**: Used for the global application backdrop.
- **Surface Layer**: Used for primary sidebar and sidebar containers.
- **Elevated Layer**: Reserved for code editors, input fields, and terminal views.
- **Overlay Layer**: Used for floating menus, tooltips, and modals.

### Accents & Status
The **Amber (#f59e0b)** accent is the sole driver of action and focus, used sparingly for active states and primary CTAs. Functional colors (Red, Green, Blue) are desaturated slightly to remain harmonious within the dark UI while maintaining high legibility for status indicators.

## Typography

Typography is used as a structural tool. **IBM Plex Sans** provides a technical yet humanistic feel for UI navigation and controls, while **JetBrains Mono** is utilized for code, data points, and metadata to ensure character distinctness.

- **Scale**: Small font sizes (11px-13px) are standard to support high-density layouts.
- **Weight**: Use SemiBold (600) for section headers and Medium (500) for active labels.
- **Contrast**: Rely on the defined text opacity tokens (92%, 55%, 30%) to establish visual hierarchy rather than varying font sizes excessively.

## Layout & Spacing

This design system uses a **4px base grid** for tight, efficient spatial management. 

### Grid & Panels
- **Layout Model**: A composite panel system. Fixed sidebars (left/right) and a flexible central workspace.
- **Borders**: Instead of gutters, panels are separated by 1px borders using the `alpha-border-low` (6%) or `medium` (10%) tokens.
- **Density**: Use "Compact" spacing for data tables and navigation trees (4-8px padding) and "Standard" spacing for document-style settings (12-16px padding).

### Breakpoints
- **Desktop (Default)**: 1440px+ (Optimized for ultra-wide displays).
- **Tablet/Small Desktop**: 1024px (Sidebars become collapsible).
- **Mobile**: Not supported for primary IDE tasks; read-only view optimized for 375px.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **1px Alpha Outlines**. There are no blurred shadows.

- **Level 0 (Base)**: #0a0b0e. No border.
- **Level 1 (Panel)**: #111318. Border: 1px solid rgba(255, 255, 255, 0.06).
- **Level 2 (Active/Input)**: #191c23. Border: 1px solid rgba(255, 255, 255, 0.10).
- **Level 3 (Popovers)**: #1e2229. Border: 1px solid rgba(255, 255, 255, 0.18).

Hover states should be indicated by a subtle background color shift (e.g., from Surface to Elevated) rather than a shadow or glow.

## Shapes

The shape language is **Strict and Functional**. 

- **Small Components**: Buttons, inputs, and tags use a `4px` (0.25rem) radius.
- **Structural Containers**: Panels and tab groups use an `8px` (0.5rem) radius only on outer corners to maintain a "nested" look.
- **Selection Indicators**: Active states in sidebars use 0px radius on the edge touching the panel border to create a "connected" tab effect.

## Components

### Buttons
- **Primary**: Amber (#f59e0b) background, Black (#000) text for maximum contrast. 4px radius.
- **Secondary**: Ghost style. 1px rgba(255, 255, 255, 0.1) border, Secondary text color.
- **Tertiary/Icon**: No border or background. Becomes Elevated background on hover.

### Input Fields
- **Default State**: Elevated (#191c23) background, 1px rgba(255, 255, 255, 0.1) border. 4px radius.
- **Focus State**: 1px Amber (#f59e0b) border. No outer glow.
- **Code Editor**: No border, Base (#0a0b0e) background to recede and focus on syntax.

### Navigation & Tabs
- **Workspace Tabs**: Flat top-tabs. Active tab has an Amber 2px top-border and Surface background.
- **Tree View**: High-density (24px row height). 12px indentation per level. Hover state uses a subtle 4% white overlay.

### Cards & Panels
- **Panel Header**: 32px height, Surface background, 1px bottom border. Caps-label typography.
- **Status Chips**: 11px JetBrains Mono. Subdued background (15% opacity of status color) with solid 1px border of the status color.
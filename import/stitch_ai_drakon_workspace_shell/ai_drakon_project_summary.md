# AI-DRAKON Project Summary & Design Specification

This document provides a comprehensive overview of the AI-DRAKON workspace design, including all screens, design tokens, and architectural principles developed during this session.

## 1. Project Overview
AI-DRAKON is a high-fidelity visual algorithm engineering platform (IDE) for software architects. The design focuses on high-density data, technical precision, and a persistent "canvas-first" architecture.

---

## 2. Design System: Precision Dark
**Theme:** Dark / Engineering-focused
- **Background Base:** `#0a0b0e` (Canvas and deep background)
- **Background Surface:** `#111318` (Panels, Sidebars, Top bar)
- **Background Elevated:** `#191c23` (Inputs, Code blocks)
- **Accent Amber:** `#f59e0b` (Primary actions, active states, running indicators)
- **Text Primary:** `rgba(255, 255, 255, 0.92)`
- **Text Secondary:** `rgba(255, 255, 255, 0.55)`
- **Typography:**
    - UI Elements: **IBM Plex Sans**
    - Technical/Code: **JetBrains Mono**
- **Border Radius:** 4px (Buttons/Inputs), 4-8px (Panels)

---

## 3. Screen Inventory

### Desktop Workspace (1366x768)
1. **Workspace Idle ({{DATA:SCREEN:SCREEN_34}})**: The primary engineering view with the diagram explorer and canvas visible.
2. **Analysis Panel - Idle ({{DATA:SCREEN:SCREEN_36}})**: Right-side panel for code entry before processing.
3. **Analysis Panel - Running ({{DATA:SCREEN:SCREEN_33}})**: Processing state with pulsing indicators and real-time complexity scoring.
4. **Generation Drawer - Idle ({{DATA:SCREEN:SCREEN_5}})**: Bottom-mounted drawer for diagram-to-code transformation parameters.
5. **Generation Done ({{DATA:SCREEN:SCREEN_3}})**: Result state showing valid syntax code blocks within the resizable drawer.
6. **Empty Canvas ({{DATA:SCREEN:SCREEN_32}})**: Onboarding state for new projects with skeletal skeleton hints.

### Mobile Workspace (375x812)
1. **Mobile Idle ({{DATA:SCREEN:SCREEN_31}})**: Streamlined 40px toolbar and maximized viewing area.
2. **Mobile Analysis ({{DATA:SCREEN:SCREEN_30}})**: Full-screen modal sheet for code entry.
3. **Mobile Generation ({{DATA:SCREEN:SCREEN_35}})**: Bottom-up 75vh sheet for mobile-optimized code generation.

---

## 4. Technical Implementation Notes
- **Persistence:** All panels are side-mounted or bottom-mounted to ensure the diagram remains the central source of truth.
- **Responsiveness:** Desktop uses a flex-shrunk canvas; mobile utilizes full-screen sheets with backdrop blurs.
- **Density:** 11-12px mono fonts are used for all technical labels to maximize information density.

---

## 5. Export Instructions
To take these designs into production or further tools:
- **HTML/CSS:** Use the 'View Code' feature on any screen to grab the production-ready source.
- **Figma:** Use the platform's 'Export to Figma' tool to maintain layer integrity.
- **Assets:** Reference the DataStore IDs for all generated SVG and image components.
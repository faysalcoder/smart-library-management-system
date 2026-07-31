---
name: La librería Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style
The design system reflects the academic excellence and institutional integrity of the World University of Bangladesh. It is built on a **Corporate / Modern** aesthetic that balances high-density information with clean, breathable layouts. 

The brand personality is authoritative yet accessible, focusing on utility for librarians and students alike. The visual style utilizes a systematic approach with subtle tonal layers, precise alignment, and a focus on clarity to manage complex data like cataloging, circulation, and user analytics without cognitive overload.

## Colors
The palette is rooted in a professional academic blue, providing a sense of stability and trust. 

- **Primary Blue (#2563EB):** Used for primary actions, active navigation states, and key data points.
- **Surface & Background:** A cool-toned background (#F8FAFC) provides a subtle contrast against white surface cards (#FFFFFF), creating clear containment for data.
- **Semantic Palette:** Standardized success, warning, and danger colors are used for status indicators (e.g., "Available", "Overdue", "Lost").
- **Neutral Scale:** Utilizes slate grays for text hierarchy and borders to maintain a soft, non-distracting UI frame.

## Typography
The typography system prioritizes legibility for intensive reading and data management.

- **Inter:** The primary workhorse for the UI. Headlines use tighter letter-spacing and heavier weights to establish a strong hierarchy.
- **JetBrains Mono:** Strictly reserved for technical identifiers such as ISBN numbers, User IDs, and Barcode strings. This ensures characters like '0' and 'O' or '1' and 'l' are easily distinguishable during manual entry or verification.
- **Scale:** A compact scale is used to accommodate high-density dashboards. Mobile views should downscale headlines by 15-20% to maintain proportions.

## Layout & Spacing
The system uses a **Fluid Grid** model with an 8px base unit.

- **Desktop:** 12-column grid with 24px gutters. Content is housed in distinct cards to separate modules (e.g., Analytics, Activity Feed, Book List).
- **Sidebar:** A fixed-width left navigation (260px) provides consistent access to main library functions.
- **Density:** High-density spacing is applied to tables and lists to maximize information visibility, while dashboard widgets utilize more generous internal padding (24px) for visual comfort.
- **Reflow:** On tablet, the sidebar collapses into a hamburger menu. On mobile, the grid collapses to a single-column stack with 16px side margins.

## Elevation & Depth
This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, institutional look.

- **Level 0 (Background):** #F8FAFC.
- **Level 1 (Cards/Surface):** White (#FFFFFF) with a 1px solid border (#E2E8F0).
- **Level 2 (Dropdowns/Modals):** White with a soft ambient shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to distinguish overlaying elements from the primary surface.
- **Active State:** A subtle 2px primary-colored border or a light blue wash (#EFF6FF) indicates focus or selection.

## Shapes
The shape language is structured and precise.

- **Cards:** 8px corner radius for all main dashboard widgets and containers. This provides a modern feel without appearing overly "bubbly."
- **Interactive Elements:** 6px corner radius for buttons, input fields, and checkboxes. The slight reduction in radius compared to cards creates a clear nested hierarchy.
- **Icons:** Use a consistent 2px stroke weight with slightly rounded joins to match the UI's geometry.

## Components
- **Buttons:** 
  - *Primary:* Solid #2563EB with white text. 
  - *Secondary:* Ghost style with #2563EB border and text.
  - *Sizing:* Default height 40px; Small 32px (for table actions).
- **Input Fields:** 1px #E2E8F0 border, 6px radius. Focused state uses 1px #2563EB with a 3px outer halo of #DBEAFE.
- **Chips/Status Tags:** 
  - Used for book categories or status. 
  - Format: Light background version of the semantic color (e.g., #DCFCE7 for success) with dark text (#166534).
- **Data Tables:** 
  - Header: #F8FAFC background, uppercase Label-MD typography.
  - Row Height: 52px for standard density; 44px for high-density cataloging.
- **Cards:** White background, 1px border, 8px radius. Internal padding should be 20px or 24px.
- **Search Bar:** Large, centered in the header with a command shortcut hint (⌘F) in JetBrains Mono.
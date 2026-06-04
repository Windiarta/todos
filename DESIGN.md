---
name: Linear App Clone Design System
colors:
  background: '#0c0d0e'
  on-background: '#f7f8f8'
  surface: '#141517'
  on-surface: '#f7f8f8'
  surface-dim: '#101113'
  surface-bright: '#1c1e21'
  surface-container-lowest: '#0c0d0e'
  surface-container-low: '#141517'
  surface-container: '#181a1d'
  surface-container-high: '#222429'
  surface-container-highest: '#2e3137'
  on-surface-variant: '#b1b8c0'
  outline: '#222326'
  outline-variant: '#2f3136'
  primary: '#5e6ad2'
  on-primary: '#ffffff'
  primary-container: '#2a2e56'
  on-primary-container: '#dce0ff'
  error: '#e24848'
  on-error: '#ffffff'
  error-container: '#4a1515'
  on-error-container: '#ffd9d9'
  ai-purple: '#8a2be2'
  ai-magenta: '#da70d6'
  ai-gradient: 'linear-gradient(135deg, #5e6ad2 0%, #8a2be2 50%, #da70d6 100%)'
typography:
  display-hero:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  heading-lg:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.019em
  heading-primary:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-default:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  small-label:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, sans-serif
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code:
    fontFamily: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
spacing:
  unit: 4px
  compact: 8px
  small: 12px
  standard: 16px
  large: 24px
  xlarge: 32px
  touch-target: 40px
---

# Linear App Clone Design System

## 1. Visual Theme & Atmosphere

The Linear App design system represents premium minimalism and functional speed. It uses near-black values, ultra-fine borders, soft glowing indicators, and keyboard-driven contextual displays.

### Key Characteristics
- **Sophisticated Dark Mode**: Main canvas is a deep slate-black `#0c0d0e`, preventing eye-strain during prolonged usage.
- **Glassmorphism & Frosted Layers**: Overlays (modals, dropdowns, command menus) use subtle alpha-transparency with `backdrop-filter: blur(12px)` and very fine borders to establish hierarchy.
- **Micro-interactions & Glows**: Use of subtle light leaks and purple-indigo glow outlines specifically for "Linear AI" active states.
- **Dense, Information-Rich Layouts**: Layout relies on alignment, clear labels, and compact vertical spacing rather than colored dividers.

## 2. Color Palette & Roles

### Base Themes
- **Main BG**: `#0c0d0e` (main window backdrops)
- **Panel BG**: `#141517` (cards, sidebar, header bars)
- **Border**: `#222326` (extremely thin boundaries)
- **Active Border / Focus**: `#5e6ad2` (indigo blue)
- **Light Theme Variant**:
  - Main BG: `#fafafa`
  - Panel BG: `#ffffff`
  - Border: `#e2e4e6`
  - Text: `#111213`

### Linear AI Accent
- **AI Highlight**: Gradient from Indigo to Violet-Magenta (`linear-gradient(135deg, #5e6ad2 0%, #8a2be2 50%, #da70d6 100%)`).
- **AI Background Glow**: Soft glowing drop-shadows with `#8a2be2` at 15% opacity.

## 3. Typography

All content uses `Inter` or the platform's default sans-serif:
- **Headings**: Tight line-height, semi-bold to bold weight, negative letter-spacing for premium feel.
- **Details & Labels**: High-contrast labels at `12px` size, weight `500` or `600`, slightly greyed out (`#b1b8c0`) for clean hierarchy.

## 4. Components

### Standard Buttons
- **Primary CTA**: `#5e6ad2` background, white text, 4px border-radius, transition on hover.
- **Secondary Ghost**: Transparent background, outline border `#222326`, text `#f7f8f8`, hover changes border to `#5e6ad2`.

### AI Command Buttons & Inputs
- **AI Trigger Input**: Double border using AI gradient outline. Underline text glows purple during generation.
- **AI Sparkle Action**: Glowing purple badge, trigger with `Tab` or click. Shows typing indicator.

### Board columns & cards
- Kanban board columns use transparent backgrounds with dotted/dashed top borders.
- Cards use `#141517` with very fine borders, and a tiny shadow `box-shadow: 0 1px 3px rgba(0,0,0,0.3)`. Hovering raises the card with a light edge highlight.

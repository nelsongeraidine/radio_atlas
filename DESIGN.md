---
name: Radio Atlas
description: A dark, minimalist world radio atlas — a night sky you tune, not just browse.
colors:
  ink: "#000000"
  paper: "#ffffff"
  signal-green: "#4ade80"
  ember-red: "#f87171"
  ember-red-light: "#fca5a5"
typography:
  display:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.05em"
  label-micro:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "8px"
  input-search:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
---

# Design System: Radio Atlas

## Overview

**Creative North Star: "The Night Signal Room"**

Radio Atlas reads like a late-night ham radio operator's console: a dark globe under real stars, a scanning dial, status text that speaks in operator shorthand ("TUNING…", "LIVE", "SIGNAL LOST"). The interface never competes with the thing it exists to serve, which is the station itself and the world it comes from. Everything is built from one surface (pure black) and one ink (white, at varying opacity) — there is no secondary neutral palette, because the product's only real "color" decisions are the two signal accents: green for live, red for kept/favorited. Every other tonal step is the same white at a different strength, which is what makes the two accents read as decisions rather than decoration.

Confirmed visual rejections: no card-and-shadow "app" look, no gradient buttons, no colorful iconography. The product's visual identity is restraint plus one moment of cosmic spectacle (the globe, stars, moon) that earns its place because it's the one surface where the product's actual subject — a spinning world full of stations — gets to be looked at directly.

**Key Characteristics:**
- Pure black canvas, white ink at variable opacity as the entire neutral system
- Two accent colors only, each tied to a specific state (green = live, red = favorited), never decorative
- Uppercase, tracked-out, small monospace-feeling technical labels for all metadata and status
- Flat by default; depth comes from opacity layering and `backdrop-blur`, not shadows
- One deliberate moment of visual richness (the 3D globe/starfield), everywhere else stays quiet

## Colors

The palette is deliberately narrow: one ink, one paper, two signal accents. Depth and hierarchy come entirely from varying the opacity of white against black, not from introducing new hues.

### Primary
- **Signal Green** (`#4ade80` / Tailwind `green-400`): the single "this is live" signal. Used only for the pulsing live-dot and the "LIVE" status word. Never used decoratively — its presence always means audio is actually playing right now.

### Secondary
- **Ember Red** (`#f87171` / Tailwind `red-400`, hover `#fca5a5` / `red-300`): the "kept" signal. Used only on the favorite heart icon when a station is favorited. Like green, it is a state indicator, not a brand color.

### Neutral
The neutral system is one value — white — expressed at different opacities against a pure black (`#000000`) canvas. Treat each opacity band below as a named role, not a one-off:
- **Hairline** (`white/5`–`white/8`): dividers, resting-state card/row backgrounds, subtlest borders.
- **Divider** (`white/10`): the standard border color between regions (header, player, panels).
- **Tertiary text / disabled** (`white/20`–`white/30`): inactive icons, placeholder-adjacent labels, disabled controls.
- **Secondary text** (`white/40`–`white/50`): the technical-label voice (`TECHNICAL_TEXT_CLASS`), supporting metadata.
- **Body text** (`white/70`–`white/80`): default readable text that isn't the primary heading.
- **Primary text** (`white/90`–`100%`): headlines, station names, anything that must read as the main content.
- **Scrim** (`black/70`–`black/95`): modal backdrops, player bar background, overlay panels — always paired with `backdrop-blur`.

### Named Rules
**The Two-Signal Rule.** Color exists for exactly two states: live (green) and favorited (red). If a new element needs a third accent color, that's a sign it needs a state, not a paint job.

**The One Ink Rule.** Never introduce a second neutral hue (no cool grays, no warm off-whites). Hierarchy is opacity, not palette.

## Typography

**Display / Body / Label Font:** Inter (`var(--font-inter)`, `system-ui, sans-serif` fallback) — one family for everything, no serif or mono pairing.

**Character:** Inter at light weight reads as quietly confident for the rare large headline ("Discover.", "Library.", onboarding lines); the same family at regular weight and small size, uppercase and tracked out, becomes the product's "instrument panel" voice for every piece of live status and metadata.

### Hierarchy
- **Display** (weight 300, `text-3xl`/`2.25rem` responsive, tight leading): page titles ("Discover.", "Library."), onboarding copy. Rare — one per page.
- **Title** (weight 400–500, `text-sm`–`text-base`): station names, city names, primary list-item labels.
- **Body** (weight 400, `text-sm`, leading relaxed): secondary descriptive copy, search result rows.
- **Label** (weight 400, `text-xs`/12px, `tracking-wide`, uppercase, `white/50`): the technical/status voice — bitrate, country, "TUNING…", "LIVE", all badge-like metadata. This is `TECHNICAL_TEXT_CLASS` in `lib/format.ts` and should be the only way this voice gets expressed at body-adjacent size.
- **Label Micro** (weight 400, `text-[9px]`–`text-[11px]`, same tracking/case): the same voice at fine-print scale — kbd shortcut hints, the mobile "Swipe ⇄" hint, tight in-row badges where 12px doesn't fit. Same rules as Label, just smaller; don't invent a third size between these two.

### Named Rules
**The Instrument Panel Rule.** Any text describing state, metadata, or technical facts (bitrate, codec, country, live status) is uppercase, tracked, small, and `white/50`. Never style this content like body copy — it should always read as read-out, not prose.

## Layout

Single-viewport app shell (`h-screen`, `overflow-hidden`) with a persistent header/nav, a scrollable content region, and a `GlobalPlayer` docked at the bottom that survives route changes. Content density is high but never cramped: list rows are compact (`px-4 py-3`-scale), while page-level headers get generous top padding (`pt-8`) to let the light-weight display type breathe.

**Responsive behavior:** the primary breakpoint is `sm` (640px). Below it, the Explore view stacks the map (`34vh`) above an absolutely-positioned side panel with unified vertical scroll; the Spotlight rail switches from a vertical list to a horizontal swipeable carousel; several icon-only controls (volume slider width, desktop-only buttons) adapt their footprint rather than disappearing outright — every interactive control keeps a real touch target on mobile even when its visual chrome shrinks.

## Elevation & Depth

Radio Atlas is flat by default and layered by opacity, not lifted by shadow. Depth is communicated by stacking translucent black/white planes with `backdrop-blur`, so content underneath still registers as present but demoted. Real `box-shadow` is reserved for the rare floating layer that must visually detach from the whole page (the search command palette, the keyboard-shortcuts modal, the projection switcher) — everything else (rows, the player bar, panels) sits flush with its background.

### Shadow Vocabulary
- **Floating overlay** (`shadow-2xl`): command palette, keyboard-shortcuts modal — content that interrupts the whole screen.
- **Docked control** (`shadow-lg`): small persistent controls like the map's projection switcher, which sit above the map but aren't a full overlay.

### Named Rules
**The Flush-Unless-Floating Rule.** If an element is part of the normal reading/scroll flow, it gets no shadow — separation comes from a border (`white/8`–`white/10`) or a background-opacity step. Shadow is reserved for things that visually leave the page (modals, popovers).

## Shapes

Corners are gently rounded almost everywhere (`rounded`, Tailwind's default `0.25rem`) for row-scale elements, stepping up to `rounded-lg`/`rounded-xl` for card-like containers (search palette, modals) and `rounded-full` for anything circular or pill-shaped (avatars, the primary play button, status dots, the projection-mode switcher). There is no sharp-cornered element anywhere in the system — softness is constant even though color is restrained.

## Components

### Buttons
- **Shape:** icon buttons use a modest `rounded` corner; the primary play/pause control is a full circle (`rounded-full`).
- **Primary (play/pause):** solid white circle, black icon, `hover:scale-105 active:scale-95` — the only button in the system with a filled background at rest.
- **Ghost (icon buttons — prev/next, favorite, share, mute, shortcuts):** transparent background, icon color starts at a low white-opacity (`white/30`–`white/50`) and brightens toward full white on hover/active. All icon-only controls carry a `min-h-11 min-w-11` invisible hit area regardless of their visual icon size, so the touch target is always ≥44px even when the glyph itself is 14–16px.
- **Secondary / Try again:** bordered ghost button (`border border-white/20`), same low-key hover-brighten treatment, used for the one recovery action in the system (stream reconnect).

### Cards / Containers (station rows, search results)
- **Corner Style:** `rounded` at row scale; rows inside a scrollable list have no visible card boundary, just a `border-b border-white/5` hairline between them.
- **Background:** transparent at rest, `white/5`–`white/8` on hover or active/selected state.
- **Shadow Strategy:** none — see Elevation.
- **Internal Padding:** `px-4 py-3` (list rows), `px-5 py-2.5` (search results).

### Inputs / Fields
- **Style:** no visible border on the input itself — the search field's "border" is actually the containing dialog's border; the field is `bg-transparent` with `placeholder-white/25`.
- **Focus:** the container (dialog) is already the focus target visually; the caret and typed text are the only focus feedback on the field itself.

### Navigation
- Top header nav uses the Label voice: uppercase, tracked, small. The active route is marked with a `border-b border-white` underline rather than a background pill or color change — navigation state, like everything else, is communicated by opacity/weight, not hue.

### Signature Component: The Globe/Starfield
The `WorldMap` component's 3D-globe mode is the system's one moment of visual spectacle: a MapLibre globe, a canvas-drawn starfield with twinkle and occasional shooting stars (`mix-blend-mode: screen`), a hand-crafted radial-gradient moon, and a soft blue atmospheric glow at the globe's edge — all fading in/out via opacity transitions when switching between 2D (mercator) and 3D (globe) projection. City markers are small pulsing white dots (`marker-pulse`) with a 44px invisible hit area. This is the one place motion and richness are earned; the rest of the product stays deliberately quiet by contrast.

## Do's and Don'ts

### Do:
- **Do** use `TECHNICAL_TEXT_CLASS` from `lib/format.ts` for any metadata, status, or technical read-out text — never restyle this voice ad hoc per component.
- **Do** keep every icon-only interactive control at a real ≥44px hit area (`min-h-11 min-w-11`), independent of the icon's visual size.
- **Do** respect `prefers-reduced-motion` for any new decorative animation (infinite loops especially): keep the state it communicates, drop only the movement.
- **Do** reserve green and red exclusively for "live" and "favorited" states respectively.

### Don't:
- **Don't** introduce a second neutral hue (warm gray, cool gray, off-white). Hierarchy is opacity on one white, always.
- **Don't** add `box-shadow` to in-flow elements (rows, panels, the player bar). Shadow is reserved for content that floats above the whole screen.
- **Don't** hide an interactive control behind `opacity-0`/hover-only reveal with no visible or touch-reachable affordance — every actionable element needs a resting-state visibility, even if subtle.
- **Don't** use a third accent color decoratively. If something needs to stand out, use white-opacity contrast, not a new hue.

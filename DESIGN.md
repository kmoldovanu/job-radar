---
name: JobRadar
description: Personal job-search PWA, dark, built like a transit line.
colors:
  night: "#0a1120"
  rail: "#0e1728"
  panel: "#131d30"
  panel-2: "#1b273d"
  line: "#27344c"
  line-strong: "#3a4a66"
  ink: "#edf1f7"
  muted: "#9aa8bf"
  faint: "#7a89a3"
  signal: "#f6b52e"
  signal-strong: "#ffc855"
  good: "#2fc27a"
  sky: "#4c97f5"
  violet: "#a184f4"
  bad: "#f0645a"
typography:
  page-title:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  card-title:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  badge-number:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
rounded:
  tag: "6px"
  control: "10px"
  badge: "12px"
  card: "14px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.signal-strong}"
  button-secondary:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-success:
    backgroundColor: "{colors.good}"
    textColor: "{colors.night}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
    padding: "16px"
  filter-pill-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.night}"
    rounded: "9px"
    height: "36px"
  line-badge-ai:
    backgroundColor: "{colors.good}"
    textColor: "{colors.night}"
    typography: "{typography.badge-number}"
    rounded: "{rounded.badge}"
    size: "52px"
---

# Design System: JobRadar

## Overview

**Creative North Star: "Linea della metro"**

The job hunt drawn as a transit line. Every offer is a stop you may board; every application is a ride with stations: Trovata, Inviata, Colloquio, Offerta. The world lends the app four things only: one signage typeface (Overpass, the highway-sign grotesk), an ink blue-black ground, line colours that carry state, and the station line as its signature move. Navigation, tabs, buttons and inputs stay the standard ones; this is a tool used every day on the phone and in long desktop sessions.

**Key Characteristics:**
- Dark always: ink blue-black ground, a cooler raised layer for cards.
- Colour means state, never decoration. Each state owns a line colour.
- Scores are line badges: rounded squares with a heavy numeral.
- One family, heavy weights for titles, tabular numerals for counts.

## Colors

### Primary
- **Amber blip** (`signal`, #f6b52e): the radar's blip. Primary action, "Nuova", active nav marker, focus ring, mid-range score.

### Line colours (state)
- **Green** (`good`, #2fc27a): strong match (score ≥ 70), "Candidato", Offerta stage, "CV pronto", central CV skills.
- **Blue** (`sky`, #4c97f5): Inviata stage, titles taken from the CV, search keywords.
- **Violet** (`violet`, #a184f4): Colloquio stage.
- **Red** (`bad`, #f0645a): Rifiutato, gaps and obstacles, chance bassa.

On tinted chips the text is a lighter tint of the same hue (#8dbcff on blue, #c3b1ff on violet, #7fe0ad on green, #ff9a92 on red), never grey.

### Neutral
- `night` page ground, `rail` inset fields and wells, `panel` cards, `panel-2` raised controls, `line` / `line-strong` hairlines and control borders.
- Text: `ink` primary, `muted` secondary (≥ 7:1 on night), `faint` tertiary and placeholders.

### Named Rules
**The Line Colour Rule.** A colour on screen names a state. If something is green it is a strong match or a positive outcome; amber is new or the next action; nothing is tinted for decoration.

## Typography

One family: Overpass (self-hosted via next/font). Titles in 700–800 with slight negative tracking, body 400 at 15px, labels 600 at 13px, badges 800 with tabular numerals.

### Hierarchy
- Page title 30px / 800, card title 18px / 700, section title 18px / 700, body 15px, meta 12–13px.

### Named Rules
**The Middle Dot Rule.** Overpass draws `·` (U+00B7) with broken spacing; separators use `∙` (U+2219).

## Layout

Single column, max width 896px (`max-w-4xl`), 16px side gutter. Mobile: sticky top bar plus fixed bottom tab bar (5 sections). Desktop: the same top bar with inline nav. Cards stack with 12px gaps; inside a card, tight groups (6–8px) and 12px between groups.

## Elevation & Depth

Flat: depth comes from layer colour (night → panel → panel-2), not shadows. Shadows only on things that float: the toast (0 10px 30px rgb(0 0 0 / 0.45)) and the active segmented tab (0 1px 2px).

## Shapes

Tags 6px, controls 10px, line badges 12px, cards 14px. Station dots are circles on a 3px line.

## Components

### Buttons
Primary amber with ink-night text; secondary panel-2 with a `line-strong` border; success green ("Candidato"); ghost text-only; 44px minimum height everywhere, icon buttons 44×44.

### Chips
Small rounded rectangles (6px), panel-2 background for neutral facts (mode, salary), tinted line colour for state.

### Cards / Containers
Panel background, 1px `line` border, 14px radius, 16px padding. Unseen offers sit on a slightly lighter panel (#152036). Hover lifts the border to `line-strong`.

### Inputs / Fields
Rail background, `line-strong` border, amber border and caret on focus, 16px text (no iOS zoom).

### Navigation
Top bar 56px with the radar mark; the active item gets a 3px amber bar (under the label on desktop, above the icon on mobile).

### Line Badge (signature)
The score. Filled in the band's line colour when the AI has evaluated the offer; a 2.5px outline in the same colour when it is only the quick estimate from the CV. Caption under it: "AI" or "stima".

### Station Line (signature)
A 3px rail with circular stations; reached stations fill with the line colour, the current one is hollow with a thicker ring, a stopped ride shows an ×. Used for each application (Trovata → Inviata → Colloquio → Offerta) and for the search run (Fonti → Filtri → Punteggio → Offerte).

## Do's and Don'ts

### Do:
- Do give every state its line colour and keep it consistent across pages.
- Do show why an offer scored as it did ("Dal tuo CV:" title + skills).
- Do keep controls standard: tabs, selects, buttons, inputs.

### Don't:
- Don't add colour for decoration or gradients.
- Don't use `·` with Overpass; use `∙`.
- Don't use eyebrow labels above headings or emoji as icons.
- Don't turn the transit theme into costume (maps, ticket stubs, station signage as layout).

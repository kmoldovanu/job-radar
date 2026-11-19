---
name: JobRadar
description: Personal job-search PWA, light and calm, one coral accent.
colors:
  white: "#ffffff"
  rail: "#f7f7f6"
  panel-2: "#f3f3f2"
  line: "#ebebea"
  line-strong: "#dcdcda"
  cream: "#f4ecdc"
  ink: "#0a0a0a"
  muted: "#5f5f5f"
  faint: "#767676"
  coral: "#d9381e"
  coral-mark: "#e5432a"
  good: "#15803d"
  amber: "#b45309"
  bad: "#b91c1c"
  sky: "#2563eb"
  violet: "#6d28d9"
typography:
  page-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  page-title-wide:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  card-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  section-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.2
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.1em"
rounded:
  control: "9999px"
  field: "12px"
  card: "16px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "#2a2a2a"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.white}"
    textColor: "#3d3d3d"
    rounded: "{rounded.control}"
    padding: "2px 10px"
  filter-pill-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "32px"
  match-tag:
    textColor: "{colors.coral}"
    typography: "{typography.mono}"
    rounded: "{rounded.control}"
    padding: "2px 8px"
  summary-panel:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: JobRadar

## Overview

**Creative North Star: "Il punto sul radar"**

A calm, light working tool. White ground, near-black ink, and one coral that always means "this matters": a new offer, a strong match, the live dot. Text is Geist; data and status speak in small, tracked Geist Mono. Controls are black or outlined pills. The owner chose this language from a reference site (www.job-radar.io) after rejecting a dark, multi-colour "transit line" direction as heavy: the lesson is restraint.

**Key Characteristics:**
- Light always: white ground, hairline borders, cream only for summary panels.
- One accent, coral, used for meaning, never decoration.
- Mono for data (match %, dates, sources, statuses), sans for everything people read.
- Black pill for the one primary action per area.

## Colors

### Primary
- **Coral** (`coral`, #d9381e for text, `coral-mark` #e5432a for dots and rings): new offers, the live dot, strong AI match (≥ 70), the active nav dot, the caret.

### Neutral
- `white` ground and cards, `rail` for wells (tailored CV box), `panel-2` for tab tracks and hover, `line` / `line-strong` hairlines and control borders, `cream` for summary panels (evaluation report, follow-ups, search result).
- Text: `ink` primary, `muted` secondary (6.4:1), `faint` tertiary and mono meta (4.5:1).

### State dots
- Small dots only, never fills: `good` chance alta / offerta, `amber` chance media / notes, `bad` chance bassa / rifiutato, `sky` inviata, `violet` colloquio.

### Named Rules
**The One Coral Rule.** Coral marks what deserves attention right now. If two coral things compete on one card, one of them is wrong.

## Typography

Geist for all reading text; Geist Mono for data and status at 11px, uppercase, 0.1em tracking.

### Hierarchy
- Page title 28px (34px from `sm`) / 600 / -0.03em; card title 17px / 600; section title 18px / 600; body 15px; controls 14px / 500; labels 13px / 500; mono 11px.

### Named Rules
**The Mono Is Data Rule.** Mono carries numbers, dates, sources and statuses. It never sits above a heading as an eyebrow.

## Layout

Single column, max width 896px, 16px gutter. Desktop: a floating white pill nav (border + soft shadow) with the active section in a black pill. Mobile: white top bar, white bottom tab bar with a coral dot on the active icon. Cards stack with 12px gaps; inside a card, 14px between groups.

## Elevation & Depth

Flat by default: hairline borders. Shadows only on things that float or invite a click: the desktop nav, the active tab, card hover (0 8px 24px -16px), the toast, the sticky save button.

## Shapes

Pills for every control, chip and tag; 12px for fields; 16px for cards and panels.

## Components

### Buttons
Primary black pill with white text; secondary white pill with `line-strong` border; ghost text-only; icon buttons 40px circles. "Candidato" uses the primary.

### Chips
Outlined pills. A chip outlined in ink is the strongest item (matched CV title, central skill filled ink).

### Cards / Containers
White, 1px `line`, 16px radius, 16–20px padding. Summary panels are cream with no border.

### Inputs / Fields
White, `line-strong` border, ink border plus a 3px soft ring on focus, coral caret, 16px text.

### Navigation
See Layout. The radar mark: grey rings, coral sweep and blip, ink centre.

### Match Tag (signature)
"81% MATCH" in mono inside a pill. AI-scored: coral text on a coral-tinted pill when strong, ink when below 70. Quick estimate from the CV: dashed outline, "64% STIMA" in muted.

### Radar Rings (signature)
Faint coral rings with one sweep and two blips behind the Offerte header, desktop only.

## Do's and Don'ts

### Do:
- Do keep coral for new, strong and live; everything else is ink and grey.
- Do put numbers, dates and sources in mono.
- Do show why an offer matches ("Dal tuo CV" + chips).

### Don't:
- Don't bring back a dark theme, multi-colour fills, heavy display weights or decorative state badges: the owner rejected them.
- Don't use mono labels as eyebrows above headings.
- Don't copy the reference site's logo, illustrations or copy.

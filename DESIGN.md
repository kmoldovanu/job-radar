---
name: JobRadar
description: Personal job-search PWA, dark and calm, one coral accent, quiet motion.
colors:
  black: "#000000"
  rail: "#0c0c0c"
  panel: "#111111"
  panel-2: "#1c1c1c"
  line: "#222222"
  line-strong: "#333333"
  hover: "#444444"
  cream: "#1a1510"
  ink: "#ededed"
  muted: "#a3a3a3"
  faint: "#8b8b8b"
  coral: "#ff5c3d"
  good: "#4ade80"
  amber: "#fbbf24"
  bad: "#f87171"
  sky: "#60a5fa"
  violet: "#a78bfa"
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
  match-number:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
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
    textColor: "{colors.black}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "#d4d4d4"
    rounded: "{rounded.control}"
    padding: "2px 10px"
  filter-pill-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.black}"
    rounded: "{rounded.control}"
    height: "32px"
  match-meter:
    textColor: "{colors.coral}"
    typography: "{typography.match-number}"
    width: "72px"
  summary-panel:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: JobRadar

## Overview

**Creative North Star: "Il punto sul radar, di notte"**

A calm, dark working tool. True black ground, light ink, and one coral that always means "this matters": a new offer, a strong match, the live dot, the radar sweep. Text is Geist; data and status speak in small, tracked Geist Mono. Controls are light or outlined pills. The language comes from the owner's reference (www.job-radar.io) and its dark section; the owner first rejected a heavy multi-colour "transit" look, then asked for this style in dark with a clearer match and more motion.

**Key Characteristics:**
- Dark always: black page, #111 cards, hairline borders, warm-black panels for summaries.
- One accent, coral, used for meaning, never decoration.
- The match is the loudest number on a card: big, with a bar and what it is.
- Motion answers actions (tabs, dismiss, expand) plus one ambient element, the radar sweep.

## Colors

### Primary
- **Coral** (`coral`, #ff5c3d, 6.9:1 on black): new offers, the live dot, strong AI match (≥ 70), the radar rings and sweep, the active mobile tab dot, the caret.

### Neutral
- `black` page, `rail` fields and wells, `panel` cards, `panel-2` tab track and chips, `line` / `line-strong` / `hover` borders by emphasis, `cream` (warm black) for summary panels.
- Text: `ink` primary, `muted` secondary (8.3:1), `faint` tertiary and mono meta (6.2:1).

### State dots
- Small dots only, never fills: `good` chance alta / offerta, `amber` chance media / notes, `bad` chance bassa / rifiutato, `sky` inviata, `violet` colloquio.

### Named Rules
**The One Coral Rule.** Coral marks what deserves attention right now. If two coral things compete on one card, one of them is wrong.

## Typography

Geist for all reading text; Geist Mono for data and status at 11px, uppercase, 0.1em tracking.

### Hierarchy
- Page title 28px (34px from `sm`) / 600 / -0.03em; match number 30px (34px from `sm`) / 600 / -0.04em; card title 17px / 600; section title 18px / 600; body 15px; controls 14px / 500; labels 13px / 500; mono 11px.

### Named Rules
**The Mono Is Data Rule.** Mono carries numbers, dates, sources and statuses. It never sits above a heading as an eyebrow.

## Layout

Single column, max width 896px, 16px gutter. Desktop: a floating dark pill nav (border + deep shadow) with the active section in a light pill that slides. Mobile: black top bar, black bottom tab bar with a coral dot that slides to the active icon. Cards stack with 12px gaps.

## Elevation & Depth

Flat by default: hairline borders on #111 cards over black. Shadows only on what floats: the desktop nav, card hover (0 16px 40px -24px black), the toast, the sticky save button.

## Shapes

Pills for every control, chip and tag; 12px for fields; 16px for cards and panels.

## Motion

Motion library (`motion/react`) with `LazyMotion` + `domMax` and `MotionConfig reducedMotion="user"` (src/components/motion.tsx); CSS keyframes for the radar.
- **Spring** (stiffness 420, damping 36): tab pill, nav pill, tab dot, card enter, toast.
- **Card list:** enters with a short stagger (45ms per card, max 8); dismiss/apply exits left in 180ms and the rest close the gap (`layout="position"`, `AnimatePresence mode="popLayout"`).
- **Details:** expand/collapse on height with the spring.
- **Match:** number counts up over 0.9s and the bar fills (ease-out expo), once.
- **Ambient:** radar sweep on the Offerte header, 9s per turn; the live dot pings. Both stop under reduced motion.

## Components

### Buttons
Primary light pill (ink) with black text; secondary dark pill with `line-strong` border; ghost text-only; icon buttons 40px circles.

### Chips
Outlined pills. A chip outlined in ink is the strongest item (matched CV title, central skill filled ink).

### Cards / Containers
#111, 1px `line`, 16px radius, 16–20px padding. Summary panels are warm black (`cream`) with no border.

### Inputs / Fields
`rail` fill, `line-strong` border, ink border plus a soft white ring on focus, coral caret, 16px text.

### Match Meter (signature)
Top right of every offer: the score as a big number with "%", a 4px bar that fills to the score, and a mono caption, "Match AI" or "Stima CV". Coral when AI-scored and ≥ 70, ink when 45–69, grey when lower or when it is only the CV estimate. In the details, "Come è calcolato il match" breaks it down with bars: AI evaluation, title closeness (with the closest CV title) and CV skills found.

### Radar (signature)
Coral rings, a 50° sweep that fades into its needle and turns slowly, two blips, behind the Offerte header on desktop.

## Do's and Don'ts

### Do:
- Do keep coral for new, strong and live; everything else is ink and grey.
- Do put numbers, dates and sources in mono.
- Do make the match readable at a glance and explain it in the details.
- Do animate what the person did (switch, dismiss, open) and keep ambient motion to the radar.

### Don't:
- Don't bring back multi-colour fills, heavy display weights or decorative state badges: the owner rejected them.
- Don't add entrance animations to every section or hover motion to every element.
- Don't use mono labels as eyebrows above headings.
- Don't copy the reference site's logo, illustrations or copy.

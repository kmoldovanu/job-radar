---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/candidature/page.tsx","src/app/profilo/page.tsx","src/app/cerca/page.tsx"]
---

# JobRadar app shell (Offerte, Cerca, Candidature, Profilo, Impostazioni)

Scope: the whole authenticated app; visitor mode Operate. Task: scan new offers ranked against the uploaded CV, judge, dismiss or apply; on desktop read ads and prepare tailored CVs/letters. Constraints: dark, radar mark stays, Italian copy, mobile bottom bar + desktop nav, standard controls.

## Direction contract

FORM: seed:89b93f0c24f37fd3 (degraded roll, no challengers). Direction: "Linea della metro".

THESIS: The job hunt as a transit line: every offer is a stop you may board, every application a ride with stations. Refuses the category default of grey cards with one accent and a percent badge.

OWN-WORLD: Ink blue-black ground with a cooler raised layer. Four line colours carry state: green (match/strong, Offerta), amber (the radar blip; Nuova, primary action), blue (Inviata/info), red (gaps/rifiutato). Line badges: rounded squares with a bold numeral, like U-Bahn line roundels. One workhorse transit-signage grotesk, wide and clear, tabular numerals.

STORY: Open the app, see the newest best-matching offers first, each with its line badge (score) and why it matches your CV; one tap to the ad, one to apply.

FIRST VIEWPORT: App bar with radar mark; title with counts as a strip; segmented tabs; offer cards where the line badge leads the row, title, company and city, then the CV reason line (matched title + skills found).

SIGNATURE: Applications drawn as a line with stations Trovata → Inviata → Colloquio → Offerta, filled up to the current one in its line colour; the CV page shows "cosa ho capito dal CV" as stations too.

RISK: Transit theming turning into costume; kept to type, palette, badges and the station line only.

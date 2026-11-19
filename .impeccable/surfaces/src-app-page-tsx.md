---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/candidature/page.tsx","src/app/profilo/page.tsx","src/app/cerca/page.tsx"]
---

# JobRadar app shell (Offerte, Cerca, Candidature, Profilo, Impostazioni)

Scope: the whole authenticated app; visitor mode Operate. Task: scan new offers ranked against the uploaded CV, judge, dismiss or apply; on desktop read ads and prepare tailored CVs/letters. Constraints: radar mark stays, Italian copy, mobile bottom bar + desktop nav, standard controls.

## Direction contract

FORM: owner-pinned reference (www.job-radar.io), replacing the earlier "Linea della metro" direction the owner rejected (font, colours, badges and station lines all disliked; too heavy). Seed: none (pinned by the user).

THESIS: A calm, light working tool where the only colour is the coral of the radar blip, and it always means "this matters": new, strong match, the next thing to do. Refuses dark dashboards, multi-colour state systems and heavy display type.

OWN-WORLD: White ground, near-black ink, warm cream for summary panels, one coral (#d9381e text, #e5432a marks). Geist for text, Geist Mono small and tracked for data and status. Black pill buttons, outlined pill chips, 16px cards with a hairline border.

STORY: Open the app, see how many new offers wait (coral dot), each card states its match as "81% MATCH" and why (titles and skills from the CV).

FIRST VIEWPORT: Floating white pill nav with the radar mark; page title with a mono live line; pill tabs and filters; offer cards with mono status, title, company, mono meta, match tag top right.

SIGNATURE: Faint coral radar rings behind the Offerte header; "NN% MATCH" mono tag.

RISK: Generic SaaS whiteness; held off by the coral discipline and the mono data voice.

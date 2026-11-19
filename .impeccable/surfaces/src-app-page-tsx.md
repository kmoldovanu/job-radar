---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/candidature/page.tsx","src/app/profilo/page.tsx","src/app/cerca/page.tsx"]
---

---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/candidature/page.tsx","src/app/profilo/page.tsx","src/app/cerca/page.tsx"]
---

# JobRadar app shell (Offerte, Cerca, Candidature, Profilo, Impostazioni)

Scope: the whole authenticated app; visitor mode Operate. Task: scan new offers ranked against the uploaded CV, judge, dismiss or apply; on desktop read ads and prepare tailored CVs/letters. Constraints: radar mark stays, Italian copy, mobile bottom bar + desktop nav, standard controls.

## Direction contract

FORM: owner-pinned reference (www.job-radar.io), in dark, after the owner rejected the "Linea della metro" direction and then asked for this style dark, with a clearer match and more motion. Seed: none (pinned by the user).

THESIS: A calm, dark working tool where the only colour is the coral of the radar blip, and it always means "this matters": new, strong match, the next thing to do. Refuses multi-colour state systems, heavy display type and decorative motion.

OWN-WORLD: Black ground, #111 cards, light ink, warm-black summary panels, one coral (#ff5c3d). Geist for text, Geist Mono small and tracked for data and status. Light pill buttons, outlined pill chips, 16px cards with a hairline border.

STORY: Open the app, see how many new offers wait (coral dot), each card leads with its match as a big number with a bar ("Match AI" or "Stima CV") and why (titles and skills from the CV).

FIRST VIEWPORT: Floating dark pill nav with the radar mark; page title with a mono live line; pill tabs and filters; offer cards with mono status, title, company, mono meta, match meter top right.

SIGNATURE: Coral radar with a slowly turning sweep behind the Offerte header; the match meter that counts up; motion that answers actions (sliding tab pill, dismissed cards leaving, details expanding).

RISK: Generic black-plus-accent look; held off by the coral discipline, the mono data voice and the radar.

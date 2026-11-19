# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- One person: the owner, a tech / IT / software professional living in Italy (EU citizen) looking for a new job, remote or abroad. The app is personal and password-protected.
- Used on the phone for a quick scroll of new offers (open, judge, dismiss or apply) and on the computer for longer sessions: reading ads in full, preparing tailored CVs and cover letters, updating the tracker. Both weigh the same.
- Visitors of the public demo (`/demo`): people looking at the project, who browse invented sample data.

## Product Purpose
JobRadar searches official job APIs and company career pages worldwide, filters out what the owner cannot realistically get (stale, scam, wrong country or visa, wrong language), ranks the rest against the owner's own uploaded CV, and turns the best matches into tailored applications. Success: fewer, better offers on screen, and the right ones turned into sent applications.

## Positioning
- Matching is computed from the real CV file the owner uploaded (stored, re-downloadable), not from a hand-filled profile.
- Strict, honest scoring: a fast keyword score without AI, then Claude as a severe recruiter. Tailored CVs pass an anti-invention check in code that strips anything not in the original CV.
- Only public, official sources; every offer shows where it came from.

## Operating Context
- Bulk work (search, AI evaluation, preparing N applications) is orchestrated by the browser as queues of short requests with a progress bar (serverless limit).
- Installable PWA; dark UI; Italian interface; ads and generated documents can be in other languages.
- Daily cron search at 06:00 UTC when configured.

## Capabilities and Constraints
- Sections: Offerte (to see / seen / all / dismissed, sort by AI score, quick score or date), Cerca, Candidature (tracker with status, notes, follow-up, CSV export), Profilo (CV upload, CV master, preferences), Impostazioni.
- Next.js 16, React 19, Tailwind 4, Postgres + Drizzle, Anthropic API; works without the AI key (quick score only, manual profile).
- Demo mode blocks anything that costs money or calls external services.

## Brand Commitments
- Name: JobRadar. The radar mark (concentric rings, sweep, one amber blip) stays as the symbol.
- The app stays dark.
- Language: Italian, plain and direct.

## Evidence on Hand
- Demo data in `src/lib/demo-seed.ts` is invented (person and companies). No real testimonials, users or metrics: do not invent any.

## Product Principles
1. The CV is the source of truth for matching; preferences only add to it.
2. Show fewer offers, honestly ranked, with the reason for the score.
3. Every offer is one tap from the original ad and its source.
4. Never invent anything in a generated CV or letter.

import type { Job, MatchDetails, Profile } from "../types";
import { cvSkills, cvTitles, skillForms, titleSimilarity } from "../cv/signals";
import { hasWord, normalize } from "./geo";

const SENIORITY: { level: number; label: string; re: RegExp }[] = [
  { level: 0, label: "stage", re: /\b(intern|internship|stage|stagiaire|praktikum|praktikant|tirocinio|trainee|werkstudent|working student)\b/ },
  { level: 1, label: "junior", re: /\b(junior|jr|entry[- ]level|graduate|associate|apprentice)\b/ },
  { level: 3, label: "senior", re: /\b(senior|sr|experienced|architect)\b/ },
  // "manager" da solo non è un livello (Project/Account/Marketing Manager): lo è "engineering manager", "senior manager"…
  { level: 4, label: "lead", re: /\b(lead|staff|principal|team lead|tech lead|engineering manager|senior manager|group manager)\b/ },
  { level: 5, label: "direttivo", re: /\b(head of|director|vp|vice president|chief|cto|ceo|cfo|coo|cio|partner)\b/ },
];
const PROFILE_LEVEL: Record<Profile["preferences"]["seniority"], number> = { junior: 1, mid: 2, senior: 3, lead: 4 };

export function jobSeniority(title: string): { level: number; label: string } | null {
  const t = normalize(title);
  // il più alto vince ("Senior Engineering Manager" → lead)
  for (const s of [...SENIORITY].reverse()) if (s.re.test(t)) return { level: s.level, label: s.label };
  return null;
}

export function yearsRequired(text: string): number | null {
  const t = normalize(text);
  const re =
    /(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?|anni|jahre|ans|anos|anos|jaar)(?:\s+(?:of\s+)?(?:professional\s+|relevant\s+|hands-on\s+|industry\s+|work\s+)?(?:experience|esperienza|berufserfahrung|erfahrung|d'experience|de experiencia|ervaring))/g;
  let max: number | null = null;
  for (const m of t.matchAll(re)) {
    const n = Number(m[1]);
    if (n > 0 && n < 30) max = max == null ? n : Math.max(max, n);
  }
  if (max == null) {
    const m2 = t.match(/(?:minimum|at least|almeno|mindestens|minimo)\s+(\d{1,2})\s*(?:years?|anni|jahre)/);
    if (m2) max = Number(m2[1]);
  }
  return max;
}

/**
 * Punteggio rapido 0-100 senza AI, calcolato sul CV (indice del CV + esperienze + competenze),
 * non solo sui ruoli scritti nelle preferenze.
 *
 * - Titolo (max 40): somiglianza con i titoli del CV, con sinonimi e traduzioni (sviluppatore = developer = engineer).
 * - Competenze (max 30, o 40 senza parole chiave): competenze del CV trovate nell'annuncio, con i loro sinonimi; quelle centrali pesano di più.
 * - Settori e parole chiave del CV (max 10).
 * - Seniority (−15 … +10) e anni richiesti (−15 … +10).
 * - Parole escluse: −15 ciascuna.
 */
export function quickMatch(job: Pick<Job, "title" | "description" | "tags">, profile: Profile): MatchDetails {
  const prefs = profile.preferences;
  const notes: string[] = [];
  const body = normalize(`${job.title}\n${job.tags.join(" ")}\n${job.description}`).replace(/\bfront[\s-]?end\b/g, "frontend").replace(/\bback[\s-]?end\b/g, "backend").replace(/\bfull[\s-]?stack\b/g, "fullstack");

  // 1. Titolo vs titoli del CV (max 40)
  const titles = cvTitles(profile);
  let titleScore = titles.length ? 0 : 0.5;
  let titleMatch: string | null = null;
  for (const t of titles) {
    const sim = titleSimilarity(job.title, t.title) * t.weight;
    if (sim > titleScore) {
      titleScore = sim;
      titleMatch = t.title;
    }
  }
  let score = Math.round(titleScore * 40);

  // 2. Competenze del CV trovate nell'annuncio (max 30, 40 se il CV non ha settori/parole chiave): 5 punti "pieni" bastano
  const idx = profile.cvIndex;
  const kwList = [...(idx?.domains ?? []), ...(idx?.keywords ?? [])];
  const skillMax = kwList.length ? 30 : 40;
  const skills = cvSkills(profile);
  const skillsFound: string[] = [];
  let skillPoints = 0;
  for (const s of skills) {
    if (skillForms(s).some((f) => hasWord(body, f))) {
      skillsFound.push(s.name);
      skillPoints += s.weight === 3 ? 1.5 : s.weight === 1 ? 0.6 : 1;
    }
  }
  score += Math.round(Math.min(skillPoints / 5, 1) * skillMax);

  // 3. Settori e parole chiave del CV (max 10)
  const keywordsFound = kwList.filter((k) => {
    const n = normalize(k).trim();
    return n.length > 2 && hasWord(body, n);
  });
  score += Math.round(Math.min(keywordsFound.length / 4, 1) * 10);

  // 4. Seniority (−15 … +10)
  const sen = jobSeniority(job.title);
  const mine = PROFILE_LEVEL[prefs.seniority];
  if (sen) {
    const diff = sen.level - mine;
    if (diff === 0) score += 10;
    else if (Math.abs(diff) === 1) score += 5;
    else {
      score -= 15;
      notes.push(diff > 0 ? `Ruolo troppo senior (${sen.label})` : `Ruolo troppo junior (${sen.label})`);
    }
  } else score += 8;

  // 5. Anni di esperienza richiesti (−15 … +10)
  const years = yearsRequired(job.description);
  if (years == null) score += 6;
  else if (years <= prefs.yearsExperience) score += 10;
  else if (years <= prefs.yearsExperience + 2) score += 4;
  else {
    score -= years > prefs.yearsExperience + 4 ? 15 : 8;
    notes.push(`Richiede ${years}+ anni (tu ne hai ${prefs.yearsExperience})`);
  }

  // 6. Parole da escludere nel testo (il titolo è gestito come scarto)
  const excluded = prefs.excludeKeywords.filter((k) => k.trim() && hasWord(body, normalize(k).trim()));
  if (excluded.length) {
    score -= 15 * excluded.length;
    notes.push(`Contiene: ${excluded.join(", ")}`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    titleScore: Math.round(Math.min(1, titleScore) * 100),
    titleMatch,
    skillsFound,
    keywordsFound: keywordsFound.slice(0, 12),
    jobSeniority: sen?.label ?? null,
    yearsRequired: years,
    notes,
  };
}

export function excludedInTitle(title: string, excludeKeywords: string[]): string | null {
  const t = normalize(title);
  return excludeKeywords.find((k) => k.trim() && hasWord(t, normalize(k).trim())) ?? null;
}

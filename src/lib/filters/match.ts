import type { Job, MatchDetails, Profile } from "../types";
import { hasWord, normalize } from "./geo";

const STOP = new Set(["and", "or", "of", "the", "a", "an", "e", "di", "de", "der", "die", "und", "for", "in", "m", "f", "w", "d", "x"]);

function tokens(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

const SENIORITY: { level: number; label: string; re: RegExp }[] = [
  { level: 0, label: "stage", re: /\b(intern|internship|stage|stagiaire|praktikum|praktikant|tirocinio|trainee|werkstudent|working student)\b/ },
  { level: 1, label: "junior", re: /\b(junior|jr|entry[- ]level|graduate|associate|apprentice)\b/ },
  { level: 3, label: "senior", re: /\b(senior|sr|experienced)\b/ },
  { level: 4, label: "lead", re: /\b(lead|staff|principal|architect|manager|team lead)\b/ },
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

/** Punteggio rapido 0-100 senza AI. */
export function quickMatch(job: Pick<Job, "title" | "description" | "tags">, profile: Profile): MatchDetails {
  const prefs = profile.preferences;
  const notes: string[] = [];
  const title = normalize(job.title);
  const body = normalize(`${job.title}\n${job.tags.join(" ")}\n${job.description}`);

  // 1. Titolo vs ruoli cercati (max 40)
  let titleScore = 0;
  const titleTokens = new Set(tokens(job.title));
  for (const role of prefs.targetRoles) {
    const rt = tokens(role);
    if (!rt.length) continue;
    if (hasWord(title, normalize(role).trim())) {
      titleScore = 1;
      break;
    }
    const hit = rt.filter((t) => titleTokens.has(t)).length / rt.length;
    titleScore = Math.max(titleScore, hit);
  }
  if (!prefs.targetRoles.length) titleScore = 0.5;
  let score = Math.round(titleScore * 40);

  // 2. Competenze trovate (max 30)
  const skillsFound = profile.skills.filter((s) => {
    const n = normalize(s).trim();
    return n.length > 1 && hasWord(body, n);
  });
  score += Math.round(Math.min(skillsFound.length / 6, 1) * 30);

  // 3. Seniority (−15 … +15)
  const sen = jobSeniority(job.title);
  const mine = PROFILE_LEVEL[prefs.seniority];
  if (sen) {
    const diff = sen.level - mine;
    if (diff === 0) score += 15;
    else if (Math.abs(diff) === 1) score += 7;
    else {
      score -= 15;
      notes.push(diff > 0 ? `Ruolo troppo senior (${sen.label})` : `Ruolo troppo junior (${sen.label})`);
    }
  } else score += 10;

  // 4. Anni di esperienza richiesti (−20 … +15)
  const years = yearsRequired(job.description);
  if (years == null) score += 8;
  else if (years <= prefs.yearsExperience) score += 15;
  else if (years <= prefs.yearsExperience + 2) score += 5;
  else {
    score -= 20;
    notes.push(`Richiede ${years}+ anni (tu ne hai ${prefs.yearsExperience})`);
  }

  // 5. Parole da escludere nel testo (il titolo è gestito come scarto)
  const excluded = prefs.excludeKeywords.filter((k) => k.trim() && hasWord(body, normalize(k).trim()));
  if (excluded.length) {
    score -= 15 * excluded.length;
    notes.push(`Contiene: ${excluded.join(", ")}`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    titleScore: Math.round(titleScore * 100),
    skillsFound,
    jobSeniority: sen?.label ?? null,
    yearsRequired: years,
    notes,
  };
}

export function excludedInTitle(title: string, excludeKeywords: string[]): string | null {
  const t = normalize(title);
  return excludeKeywords.find((k) => k.trim() && hasWord(t, normalize(k).trim())) ?? null;
}

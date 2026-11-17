import type { Profile, TailoredCv } from "../types";

/**
 * Controllo anti-invenzioni (in codice, dopo la generazione AI).
 * Il CV su misura può solo selezionare/riordinare/riformulare/tradurre dal CV master.
 */

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

const LEGAL = /\b(inc|ltd|llc|gmbh|srl|s r l|spa|s p a|sa|bv|ag|plc|co|corp|group)\b/g;
function normCompany(s: string) {
  return norm(s).replace(LEGAL, "").replace(/\s+/g, " ").trim();
}

function sameEntity(a: string, b: string): boolean {
  const x = normCompany(a);
  const y = normCompany(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y));
}

/** Tutto il testo del master, per verificare numeri e competenze. */
export function masterText(p: Profile): string {
  return [
    p.name, p.headline, p.summary, p.location,
    ...p.experience.flatMap((e) => [e.company, e.role, e.location, e.start, e.end, ...e.bullets]),
    ...p.education.flatMap((e) => [e.institution, e.degree, e.start, e.end, e.details]),
    ...p.skills, ...p.certifications,
    ...p.projects.flatMap((x) => [x.name, x.description, ...x.bullets]),
    ...p.languages.map((l) => `${l.name} ${l.level}`),
  ].join("\n");
}

/** Estrae i numeri "significativi" (metriche, percentuali, importi) da un testo. */
export function extractNumbers(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\d+(?:[.,]\d{3})*(?:[.,]\d+)?/g)) {
    const raw = m[0].trim();
    // normalizza separatori: "1.200" "1,200" "1 200" → "1200"; "3,5" "3.5" → "3.5"
    let n = raw.replace(/\s/g, "");
    if (/^\d{1,3}([.,]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, "");
    else n = n.replace(",", ".");
    n = n.replace(/^0+(?=\d)/, "");
    if (n) out.push(n);
  }
  return out;
}

/** Abbreviazioni tipo "50k", "2M" → valori espansi per il confronto. */
function expandShortcuts(s: string): string[] {
  const extra: string[] = [];
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*([kKmM])\b/g)) {
    const base = Number(m[1].replace(",", "."));
    const mult = m[2].toLowerCase() === "k" ? 1e3 : 1e6;
    extra.push(String(Math.round(base * mult)));
  }
  return extra;
}

export function numberSet(text: string): Set<string> {
  return new Set([...extractNumbers(text), ...expandShortcuts(text)]);
}

function bulletHasUnknownNumbers(bullet: string, allowed: Set<string>): string | null {
  const nums = [...extractNumbers(bullet), ...expandShortcuts(bullet)];
  for (const n of nums) {
    if (!allowed.has(n)) return n;
  }
  return null;
}

function skillKnown(skill: string, p: Profile, mText: string): boolean {
  const s = norm(skill);
  if (!s) return false;
  if (p.skills.some((x) => norm(x) === s)) return true;
  // ammessa se compare come parola nel testo del master (es. citata in un'esperienza)
  const re = new RegExp(`(^| )${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
  return re.test(norm(mText));
}

export interface GuardResult {
  cv: TailoredCv;
  corrections: string[];
}

export function guardTailoredCv(cv: TailoredCv, master: Profile): GuardResult {
  const corrections: string[] = [];
  const mText = masterText(master);
  const allowedNums = numberSet(mText);
  const out: TailoredCv = structuredClone(cv);

  // Dati di contatto: sempre quelli del master
  for (const k of ["name", "email", "phone"] as const) {
    if (master[k] && out[k] !== master[k]) {
      if (out[k]) corrections.push(`Dato di contatto "${k}" ripristinato dal CV master`);
      out[k] = master[k];
    }
  }
  if (master.links.length) {
    const extra = out.links.filter((l) => !master.links.some((m) => norm(m) === norm(l)));
    if (extra.length) corrections.push(`Rimossi link non presenti nel master: ${extra.join(", ")}`);
    out.links = out.links.filter((l) => master.links.some((m) => norm(m) === norm(l)));
  } else if (out.links.length) {
    corrections.push("Rimossi link non presenti nel master");
    out.links = [];
  }

  // Esperienze: azienda deve esistere nel master, date forzate dal master
  out.experience = out.experience.flatMap((e) => {
    const m = master.experience.find((x) => sameEntity(x.company, e.company));
    if (!m) {
      corrections.push(`Rimossa esperienza presso "${e.company}" (azienda non presente nel CV master)`);
      return [];
    }
    if (e.start !== m.start || e.end !== m.end) {
      corrections.push(`Date di "${m.company}" riportate a quelle del master (${m.start} – ${m.end || "oggi"})`);
    }
    const bullets = e.bullets.filter((b) => {
      const bad = bulletHasUnknownNumbers(b, allowedNums);
      if (bad) corrections.push(`Rimosso punto con dato "${bad}" non presente nel master: "${truncate(b)}"`);
      return !bad;
    });
    return [{ ...e, company: m.company, start: m.start, end: m.end, bullets }];
  });

  // Formazione: istituto deve esistere, date dal master
  out.education = out.education.flatMap((e) => {
    const m = master.education.find((x) => sameEntity(x.institution, e.institution));
    if (!m) {
      corrections.push(`Rimossa formazione "${e.institution}" (non presente nel master)`);
      return [];
    }
    return [{ ...e, institution: m.institution, start: m.start, end: m.end }];
  });

  // Competenze
  const keptSkills: string[] = [];
  for (const s of out.skills) {
    if (skillKnown(s, master, mText)) keptSkills.push(s);
    else corrections.push(`Rimossa competenza non presente nel master: "${s}"`);
  }
  out.skills = keptSkills;

  // Certificazioni: solo quelle del master
  out.certifications = out.certifications.filter((c) => {
    const ok = master.certifications.some((m) => sameEntity(m, c) || norm(m) === norm(c));
    if (!ok) corrections.push(`Rimossa certificazione non presente nel master: "${c}"`);
    return ok;
  });

  // Lingue: solo quelle del master, livello dal master
  out.languages = out.languages.flatMap((l) => {
    const m = master.languages.find(
      (x) => norm(x.name) === norm(l.name) || (x.code && norm(l.name).startsWith(x.code)) || sameLang(x.name, l.name),
    );
    if (!m) {
      if (master.languages.length) corrections.push(`Rimossa lingua non presente nel master: "${l.name}"`);
      return master.languages.length ? [] : [l];
    }
    return [{ name: l.name, level: m.level === "native" ? l.level || "native" : m.level }];
  });

  // Progetti: devono esistere nel master
  out.projects = out.projects.flatMap((p) => {
    const m = master.projects.find((x) => sameEntity(x.name, p.name));
    if (!m) {
      corrections.push(`Rimosso progetto "${p.name}" (non presente nel master)`);
      return [];
    }
    const bullets = p.bullets.filter((b) => {
      const bad = bulletHasUnknownNumbers(b, allowedNums);
      if (bad) corrections.push(`Rimosso punto con dato "${bad}" non presente nel master: "${truncate(b)}"`);
      return !bad;
    });
    return [{ ...p, bullets }];
  });

  // Sommario: frasi con numeri non presenti nel master vengono tolte
  const { text: summary, removed } = stripSentencesWithUnknownNumbers(out.summary, allowedNums);
  if (removed.length) corrections.push(...removed.map((r) => `Rimossa frase del profilo con dato non verificabile: "${truncate(r)}"`));
  out.summary = summary;

  return { cv: out, corrections };
}

/** Nella lettera sono ammessi i numeri del master e quelli presenti nell'annuncio. */
export function guardLetter(letter: string, master: Profile, jobText: string): { letter: string; corrections: string[] } {
  const allowed = new Set([...numberSet(masterText(master)), ...numberSet(jobText)]);
  for (let y = 1990; y <= new Date().getFullYear() + 1; y++) allowed.add(String(y)); // date della lettera
  const paragraphs = letter.split(/\n/);
  const corrections: string[] = [];
  const outParas = paragraphs.map((p) => {
    const { text, removed } = stripSentencesWithUnknownNumbers(p, allowed);
    corrections.push(...removed.map((r) => `Lettera: rimossa frase con dato non verificabile: "${truncate(r)}"`));
    return text;
  });
  return { letter: outParas.join("\n"), corrections };
}

function stripSentencesWithUnknownNumbers(text: string, allowed: Set<string>) {
  const sentences = text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [text];
  const removed: string[] = [];
  const kept = sentences.filter((s) => {
    const bad = bulletHasUnknownNumbers(s, allowed);
    if (bad) removed.push(s.trim());
    return !bad;
  });
  return { text: kept.join("").trim(), removed };
}

const LANG_ALIASES: string[][] = [
  ["italian", "italiano", "italienisch", "italien"],
  ["english", "inglese", "englisch", "anglais", "ingles", "engels"],
  ["german", "tedesco", "deutsch", "allemand", "aleman", "duits"],
  ["french", "francese", "franzosisch", "francais", "frances", "frans"],
  ["spanish", "spagnolo", "spanisch", "espagnol", "espanol", "spaans"],
  ["portuguese", "portoghese", "portugiesisch", "portugais", "portugues"],
  ["dutch", "olandese", "niederlandisch", "neerlandais", "nederlands"],
];
function sameLang(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  return LANG_ALIASES.some((g) => g.includes(x) && g.includes(y));
}

function truncate(s: string, n = 90) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

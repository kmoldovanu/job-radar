import { normalize } from "../filters/geo";
import type { CvIndex, CvSkill, Profile } from "../types";

/**
 * Segnali dal CV: cosa la ricerca deve cercare e cosa il punteggio rapido deve riconoscere.
 * Funzioni pure (niente database, niente AI), testate in tests/cv-signals.test.ts.
 */

/* ------------------------------------------------------------------ */
/* Parole da ignorare quando si ricava l'indice dal testo              */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  (
    // inglese
    "the and for with from that this have has had are was were will would can could should into onto over under about " +
    "your you our their them they his her its who whom what which when where while than then also more most less very " +
    "such each other some any all not but only just been being both between through during before after above below " +
    "per via etc using used use including include includes within across based new well high good great strong work " +
    "working worked team teams company companies role roles years year month months experience experienced responsible " +
    "responsibilities responsibility support supported supporting management managed managing develop developed developing " +
    "development project projects client clients customer customers business data process processes activities activity " +
    "skills skill knowledge ability able level main daily various several different" +
    // italiano
    " del della delle dei degli dal dalla dalle dai con per tra fra che chi come anche più meno molto sono stato stata " +
    "stati state essere avere ho hai abbiamo nel nella nelle nei negli sul sulla sulle sui una uno gli les des " +
    "attività gestione sviluppo progetto progetti cliente clienti azienda aziende lavoro esperienza esperienze " +
    "competenze conoscenza conoscenze ruolo presso anni anno mese mesi tutti tutte ogni varie vari diversi diverse" +
    // tedesco, francese, spagnolo (le più frequenti)
    " und der die das mit für von auf bei eine einer einem ist sind wir les une pour avec dans sur par los las por para " +
    "con una del como"
  ).split(" "),
);

/** Parole che nei titoli dicono il livello, non il mestiere: non contano per il confronto dei titoli. */
const TITLE_NOISE = new Set(
  (
    "senior sr junior jr lead staff principal head chief associate intern internship trainee graduate entry level mid " +
    "i ii iii iv v m f w d x h remote hybrid onsite fulltime full time part parttime contract freelance temporary " +
    "europe emea eu italy italia germany uk us usa worldwide global anywhere based new"
  ).split(" "),
);

/** Parole di collegamento nei titoli ("Head of Data", "Responsabile di progetto"). */
const TITLE_STOP = new Set("of and e di del della dei degli de des du la le el los las da do das for the a an in y und et für fur mit with to at".split(" "));

/**
 * Sinonimi e traduzioni dei mestieri: "sviluppatore", "developer" ed "engineer" contano come la stessa parola.
 * Tutto normalizzato (minuscolo, senza accenti).
 */
const TITLE_SYNONYMS: Record<string, string> = {
  developer: "engineer", programmer: "engineer", sviluppatore: "engineer", sviluppatrice: "engineer",
  programmatore: "engineer", programmatrice: "engineer", entwickler: "engineer", entwicklerin: "engineer",
  developpeur: "engineer", developpeuse: "engineer", desarrollador: "engineer", desarrolladora: "engineer",
  ingegnere: "engineer", ingenieur: "engineer", ingeniero: "engineer", engineer: "engineer", dev: "engineer", swe: "engineer",
  software: "software", informatico: "software",
  analista: "analyst", analytiker: "analyst", analyste: "analyst", analyst: "analyst",
  responsabile: "manager", gestore: "manager", leiter: "manager", leiterin: "manager", gerente: "manager",
  direttore: "director", direttrice: "director", directeur: "director", direktor: "director", director: "director",
  consulente: "consultant", berater: "consultant", beraterin: "consultant", consultor: "consultant", consultant: "consultant",
  specialista: "specialist", spezialist: "specialist", specialiste: "specialist", especialista: "specialist", expert: "specialist",
  esperto: "specialist", esperta: "specialist",
  progettista: "designer", disegnatore: "designer", designer: "designer",
  tecnico: "technician", techniker: "technician", technicien: "technician", technician: "technician",
  commerciale: "sales", venditore: "sales", vendite: "sales", vertrieb: "sales", sales: "sales",
  amministratore: "administrator", admin: "administrator", sysadmin: "administrator", administrator: "administrator",
  assistente: "assistant", assistent: "assistant", assistant: "assistant",
  coordinatore: "coordinator", coordinatrice: "coordinator", koordinator: "coordinator", coordinator: "coordinator",
  contabile: "accountant", ragioniere: "accountant", buchhalter: "accountant", comptable: "accountant", accountant: "accountant",
  architetto: "architect", architekt: "architect", architect: "architect",
  ricercatore: "researcher", ricercatrice: "researcher", forscher: "researcher", researcher: "researcher",
  scienziato: "scientist", scientist: "scientist",
  insegnante: "teacher", docente: "teacher", lehrer: "teacher", teacher: "teacher",
  traduttore: "translator", traduttrice: "translator", translator: "translator",
  marketing: "marketing", operations: "operations", operativo: "operations",
  prodotto: "product", produkt: "product", product: "product",
  progetto: "project", projekt: "project", project: "project",
  dati: "data", daten: "data", donnees: "data", datos: "data", data: "data",
  frontend: "frontend", backend: "backend", fullstack: "fullstack",
  devops: "devops", sre: "devops",
  qa: "qa", tester: "qa", collaudatore: "qa",
  ux: "ux", ui: "ui",
  hr: "hr", recruiter: "recruiter", selezionatore: "recruiter",
  supporto: "support", support: "support", helpdesk: "support",
};

/* ------------------------------------------------------------------ */
/* Parole                                                              */
/* ------------------------------------------------------------------ */

/** Unisce le forme scritte in modi diversi: "front-end" → "frontend", "full stack" → "fullstack". */
function joinCompounds(s: string): string {
  return s
    .replace(/\bfront[\s-]?end\b/g, "frontend")
    .replace(/\bback[\s-]?end\b/g, "backend")
    .replace(/\bfull[\s-]?stack\b/g, "fullstack")
    .replace(/\bdev[\s-]?ops\b/g, "devops")
    .replace(/\bhelp[\s-]?desk\b/g, "helpdesk")
    .replace(/\bsys[\s-]?admin\b/g, "sysadmin");
}

export function words(s: string): string[] {
  return joinCompounds(normalize(s))
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
}

/** Parole di un titolo che dicono il mestiere, già tradotte nella forma comune. */
export function titleWords(title: string): string[] {
  const out = new Set<string>();
  // tolgo le parentesi e quello che segue una barra verticale: di solito località o contratto
  const core = title.replace(/\(.*?\)|\[.*?\]/g, " ").split(/\s\|\s/)[0] ?? title;
  for (const w of words(core)) {
    if (w.length < 2 && !/^[a-z]$/.test(w)) continue;
    if (TITLE_NOISE.has(w) || TITLE_STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(TITLE_SYNONYMS[w] ?? w);
  }
  return [...out];
}

/**
 * Somiglianza tra il titolo dell'offerta e un titolo del CV, 0..1.
 * Conta soprattutto quanto del titolo del CV si ritrova nell'offerta; le parole in più dell'offerta pesano poco.
 */
export function titleSimilarity(jobTitle: string, cvTitle: string): number {
  const a = titleWords(cvTitle);
  const b = new Set(titleWords(jobTitle));
  if (!a.length || !b.size) return 0;
  const common = a.filter((w) => b.has(w)).length;
  if (!common) return 0;
  const containment = common / a.length;
  const dice = (2 * common) / (a.length + b.size);
  return Math.min(1, 0.75 * containment + 0.25 * dice);
}

/* ------------------------------------------------------------------ */
/* Segnali dal profilo + indice                                        */
/* ------------------------------------------------------------------ */

function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = raw.trim();
    const k = normalize(s);
    if (!s || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/** Titoli con cui confrontare le offerte: dal CV prima di tutto, poi i ruoli scritti a mano. */
export function cvTitles(profile: Profile): { title: string; weight: number }[] {
  const idx = profile.cvIndex;
  const out: { title: string; weight: number }[] = [];
  const add = (title: string, weight: number) => {
    const k = normalize(title.trim());
    if (!k) return;
    const prev = out.find((o) => normalize(o.title) === k);
    if (prev) prev.weight = Math.max(prev.weight, weight);
    else out.push({ title: title.trim(), weight });
  };
  for (const t of idx?.titles ?? []) add(t, 1);
  for (const t of profile.preferences.targetRoles) add(t, 1);
  if (profile.headline) add(profile.headline, 0.95);
  // le esperienze: la più recente vale quasi come un titolo cercato, le vecchie un po' meno
  profile.experience.forEach((e, i) => add(e.role, i === 0 ? 0.9 : 0.75));
  return out;
}

/** Competenze del CV con i loro sinonimi; quelle scritte nel profilo si aggiungono con peso medio. */
export function cvSkills(profile: Profile): CvSkill[] {
  const map = new Map<string, CvSkill>();
  const add = (s: CvSkill) => {
    const k = normalize(s.name.trim());
    if (!k) return;
    const prev = map.get(k);
    if (prev) {
      prev.aliases = uniq([...prev.aliases, ...s.aliases]);
      prev.weight = Math.max(prev.weight, s.weight);
    } else map.set(k, { name: s.name.trim(), aliases: uniq(s.aliases), weight: s.weight });
  };
  for (const s of profile.cvIndex?.skills ?? []) add(s);
  for (const s of profile.skills) add({ name: s, aliases: [], weight: 2 });
  return [...map.values()];
}

/** Tutte le forme da cercare nel testo per una competenza (nome, sinonimi, e il nome senza la parte tra parentesi). */
export function skillForms(s: CvSkill): string[] {
  const forms = [s.name, ...s.aliases, s.name.replace(/\s*\(.*?\)\s*/g, " ")];
  return uniq(forms.map((f) => joinCompounds(normalize(f)).replace(/\s+/g, " ").trim()).filter((f) => f.length > 1));
}

/**
 * Parole chiave per le API di ricerca. Alterna titoli dal CV e ruoli scritti a mano,
 * così entrambi arrivano alle fonti che accettano poche query.
 */
export function searchQueries(profile: Profile, max = 6): string[] {
  const fromCv = uniq([...(profile.cvIndex?.titles ?? []), profile.experience[0]?.role ?? "", profile.headline]);
  const manual = uniq(profile.preferences.targetRoles);
  const out: string[] = [];
  for (let i = 0; out.length < max && (i < fromCv.length || i < manual.length); i++) {
    for (const q of [fromCv[i], manual[i]]) {
      if (q && out.length < max && !out.some((o) => normalize(o) === normalize(q))) out.push(q);
    }
  }
  // le query lunghe ("Responsabile amministrazione e controllo di gestione") trovano poco: le accorcio
  return out.map((q) => q.replace(/\s*[(/,].*$/, "").split(/\s+/).slice(0, 5).join(" ")).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Indice senza AI: dal testo del CV                                   */
/* ------------------------------------------------------------------ */

/**
 * Indice ricavato solo dal testo: parole e coppie di parole che il CV ripete,
 * titoli dalle esperienze, competenze dal profilo. Serve quando manca la chiave Anthropic.
 */
export function buildTextIndex(rawText: string, profile: Profile, now = new Date()): CvIndex {
  // via email, link e telefono; via anche nome e città della persona, che non dicono nulla sul mestiere
  const personal = new Set(words(`${profile.name} ${profile.location}`));
  const clean = rawText.replace(/\S+@\S+|https?:\/\/\S+|www\.\S+|\+?\d[\d\s().-]{7,}\d/g, " ");
  const toks = words(clean).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !personal.has(w) && !/^\d+$/.test(w));
  const freq = new Map<string, number>();
  for (let i = 0; i < toks.length; i++) {
    freq.set(toks[i], (freq.get(toks[i]) ?? 0) + 1);
    if (i + 1 < toks.length) {
      const bi = `${toks[i]} ${toks[i + 1]}`;
      freq.set(bi, (freq.get(bi) ?? 0) + 1);
    }
  }
  const keywords = [...freq.entries()]
    .filter(([k, n]) => (k.includes(" ") ? n >= 2 : n >= 2 && k.length > 3))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([k]) => k);

  return {
    titles: uniq([profile.headline, ...profile.experience.map((e) => e.role), ...profile.preferences.targetRoles]).slice(0, 8),
    // le parole singole che il CV ripete valgono come competenze leggere (strumenti, tecnologie, metodi)
    skills: [
      ...profile.skills.map((s) => ({ name: s, aliases: [], weight: 2 })),
      ...keywords
        .filter((k) => !k.includes(" ") && !profile.skills.some((s) => normalize(s) === k))
        .slice(0, 30)
        .map((k) => ({ name: k, aliases: [], weight: 1 })),
    ],
    domains: [],
    keywords: keywords.filter((k) => k.includes(" ")),
    source: "text",
    builtAt: now.toISOString(),
  };
}

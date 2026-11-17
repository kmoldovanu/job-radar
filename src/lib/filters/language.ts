import type { LanguageLevel, Profile } from "../types";
import { normalize } from "./geo";

export const LEVEL_RANK: Record<LanguageLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, native: 7 };
const B2 = LEVEL_RANK.B2;

interface LangInfo {
  label: string;
  names: string[];
  /** parole che da sole indicano una richiesta (es. "Deutschkenntnisse") */
  implicit?: RegExp;
  stopwords?: string[];
}

export const LANGS: Record<string, LangInfo> = {
  en: {
    label: "inglese",
    names: ["english", "inglese", "englisch", "anglais", "ingles", "engels", "ingles"],
    stopwords: ["the", "and", "you", "with", "for", "our", "will", "are", "your", "we", "to", "of", "is", "in", "experience"],
  },
  it: {
    label: "italiano",
    names: ["italian", "italiano", "italienisch", "italien"],
    stopwords: ["il", "la", "di", "che", "per", "con", "una", "sono", "della", "nel", "esperienza", "lavoro", "gli", "delle"],
  },
  de: {
    label: "tedesco",
    names: ["german", "tedesco", "deutsch", "deutsche", "allemand", "aleman", "duits", "alemao"],
    implicit: /deutschkenntnisse|deutsche sprachkenntnisse|deutsch (?:in wort und schrift|auf (?:c1|c2|b2|muttersprach))/,
    stopwords: ["und", "der", "die", "das", "mit", "fur", "wir", "sie", "ist", "ein", "eine", "auf", "zu", "den", "bei"],
  },
  fr: {
    label: "francese",
    names: ["french", "francese", "franzosisch", "francais", "frances", "frans"],
    stopwords: ["le", "la", "les", "des", "et", "pour", "avec", "une", "nous", "vous", "dans", "est", "du", "sur"],
  },
  es: {
    label: "spagnolo",
    names: ["spanish", "spagnolo", "spanisch", "espagnol", "espanol", "castellano", "spaans"],
    stopwords: ["el", "los", "las", "y", "para", "con", "una", "del", "que", "en", "por", "experiencia", "nuestro"],
  },
  nl: {
    label: "olandese",
    names: ["dutch", "olandese", "niederlandisch", "neerlandais", "neerlandes", "nederlands", "flemish"],
    stopwords: ["het", "een", "van", "en", "voor", "met", "wij", "je", "jij", "zijn", "bij", "ons", "naar"],
  },
  pt: {
    label: "portoghese",
    names: ["portuguese", "portoghese", "portugiesisch", "portugais", "portugues"],
    stopwords: ["os", "as", "para", "com", "uma", "do", "da", "que", "em", "voce", "nossa", "nao", "experiencia"],
  },
  pl: { label: "polacco", names: ["polish", "polacco", "polnisch", "polonais", "polski"], stopwords: ["i", "w", "na", "z", "do", "jest", "oraz", "dla", "sie", "nie"] },
  sv: { label: "svedese", names: ["swedish", "svedese", "schwedisch", "suedois", "svenska"], stopwords: ["och", "att", "det", "som", "en", "for", "med", "har", "vi", "du"] },
  da: { label: "danese", names: ["danish", "danese", "danisch", "danois", "dansk"], stopwords: ["og", "at", "det", "er", "en", "til", "med", "vi", "du", "af"] },
  no: { label: "norvegese", names: ["norwegian", "norvegese", "norwegisch", "norvegien", "norsk"], stopwords: ["og", "som", "det", "er", "en", "til", "med", "vi", "du", "av"] },
  fi: { label: "finlandese", names: ["finnish", "finlandese", "finnisch", "finnois", "suomi"] },
  cs: { label: "ceco", names: ["czech", "ceco", "tschechisch", "tcheque", "cestina"] },
  hu: { label: "ungherese", names: ["hungarian", "ungherese", "ungarisch", "hongrois", "magyar"] },
  ro: { label: "rumeno", names: ["romanian", "rumeno", "rumanisch", "roumain"] },
  el: { label: "greco", names: ["greek", "greco", "griechisch", "grec"] },
  ja: { label: "giapponese", names: ["japanese", "giapponese", "japanisch", "japonais"] },
  zh: { label: "cinese", names: ["mandarin", "chinese", "cinese", "chinesisch", "cantonese"] },
  ko: { label: "coreano", names: ["korean", "coreano", "koreanisch", "coreen"] },
  ru: { label: "russo", names: ["russian", "russo", "russisch", "russe"] },
  ar: { label: "arabo", names: ["arabic", "arabo", "arabisch", "arabe"] },
  tr: { label: "turco", names: ["turkish", "turco", "turkisch", "turc"] },
};

const REQUIRE =
  /fluen(?:t|cy)|native|mother tongue|proficien|business[- ]level|business fluent|professional (?:working )?(?:level|proficiency)|excellent|strong (?:written|verbal|command|knowledge)|very good|good command|full professional|working knowledge|required|requirement|must|mandatory|essential|\b(?:c1|c2|b2)\b|fliessend|fließend|verhandlungssicher|sehr gute|gute .{0,20}kenntnisse|muttersprach|erforderlich|vorausgesetzt|zwingend|courant|bilingue|maitrise|exige|requis|obligatoire|madrelingua|ottima conoscenza|buona conoscenza|richiest|indispensabile|fluido|fluente|nativo|imprescindible|requerido|dominio|vloeiend|vereist|uitstekend/;

const NICE =
  /nice[- ]to[- ]have|(?:is |would be |are )?an? (?:plus|bonus|advantage)|advantageous|\bbonus\b|preferred|preferably|desirable|desired|ideally|beneficial|would be great|helpful|von vorteil|wunschenswert|ein plus|idealerweise|un plus|un atout|souhaite|apprecie|gradit|preferibil|costituisce titolo|valorara|deseable|se valora|pluspunt|een pre/;

/** Uso della parola come nazionalità, non come lingua ("German company", "French market"). */
const NATIONALITY_AFTER = /^[- ](?:speaking )?(?:company|startup|market|customers?|clients?|team|office|subsidiary|headquarters|based|government|law|tax|citizens?)\b/;

/** Mappa codice lingua → livello dell'utente (0 se non la parla). */
export function userLevels(profile: Pick<Profile, "languages">): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of profile.languages) {
    const code = (l.code || codeFromName(l.name) || "").toLowerCase();
    if (code) out[code] = Math.max(out[code] ?? 0, LEVEL_RANK[l.level] ?? 0);
  }
  return out;
}

export function codeFromName(name: string): string | null {
  const n = normalize(name).trim();
  for (const [code, info] of Object.entries(LANGS)) {
    if (code === n || info.names.includes(n)) return code;
  }
  return null;
}

/** Rileva la lingua in cui è scritto il testo (euristica sulle parole più frequenti). */
export function detectLanguage(text: string): string | null {
  const words = normalize(text.slice(0, 4000)).match(/[a-z]+/g) ?? [];
  if (words.length < 20) return null;
  const counts: Record<string, number> = {};
  for (const [code, info] of Object.entries(LANGS)) {
    if (!info.stopwords) continue;
    const set = new Set(info.stopwords);
    counts[code] = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [best, second] = sorted;
  if (!best || best[1] < 6) return null;
  if (second && best[1] < second[1] * 1.3) return null;
  return best[0];
}

export interface LanguageResult {
  ok: boolean;
  detail?: string;
  /** lingua in cui è scritto l'annuncio, se rilevata */
  adLanguage: string | null;
}

export function checkLanguage(text: string, profile: Pick<Profile, "languages">): LanguageResult {
  const adLanguage = detectLanguage(text);
  const levels = userLevels(profile);
  if (!Object.keys(levels).length) return { ok: true, adLanguage }; // profilo senza lingue: filtro disattivo

  if (adLanguage && (levels[adLanguage] ?? 0) < B2) {
    return { ok: false, adLanguage, detail: `Annuncio scritto in ${LANGS[adLanguage]?.label ?? adLanguage}` };
  }

  const sentences = normalize(text)
    .split(/[\n•;!?]+|\.(?:\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const [code, info] of Object.entries(LANGS)) {
    if ((levels[code] ?? 0) >= B2) continue;
    for (const s of sentences) {
      if (NICE.test(s)) continue;
      if (info.implicit?.test(s)) return { ok: false, adLanguage, detail: `Richiede ${info.label}` };
      for (const name of info.names) {
        const idx = findWord(s, name);
        if (idx < 0) continue;
        const after = s.slice(idx + name.length);
        if (NATIONALITY_AFTER.test(after)) continue;
        const window = s.slice(Math.max(0, idx - 60), idx + name.length + 60);
        if (REQUIRE.test(window)) return { ok: false, adLanguage, detail: `Richiede ${info.label}` };
      }
    }
  }
  return { ok: true, adLanguage };
}

function findWord(s: string, w: string): number {
  const re = new RegExp(`(^|[^a-z])${w}(?=$|[^a-z])`);
  const m = re.exec(s);
  return m ? m.index + m[1].length : -1;
}

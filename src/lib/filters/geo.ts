import type { Job, Preferences } from "../types";
import {
  AMBIGUOUS_CODES, BAD_CITIES, BAD_COUNTRIES, BAD_REGIONS, ELIGIBLE_CITIES, ELIGIBLE_COUNTRIES, OK_REGIONS,
  US_STATES,
} from "./places";

export type PlaceClass = "eligible" | "region_ok" | "ineligible" | "unknown";

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const wordCache = new Map<string, RegExp>();
/** Cerca `term` come parola intera (non dentro altre parole). */
export function hasWord(text: string, term: string): boolean {
  let re = wordCache.get(term);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escapeRe(term)}(?=$|[^a-z0-9])`);
    wordCache.set(term, re);
  }
  return re.test(text);
}

const ELIGIBLE_NAMES = Object.values(ELIGIBLE_COUNTRIES).flat();
const ELIGIBLE_CODES = new Set(Object.keys(ELIGIBLE_COUNTRIES));
const US_STATE_NAMES = Object.values(US_STATES);

/**
 * Classifica una singola stringa di località.
 * Esempi: "Berlin, Germany" → eligible; "Austin, TX" → ineligible; "EMEA" → region_ok; "Remote" → unknown.
 */
export function classifyPlace(raw: string): { cls: PlaceClass; label: string } {
  const original = raw.trim();
  if (!original) return { cls: "unknown", label: "" };
  const t = normalize(original);

  const eligibleCity = ELIGIBLE_CITIES.find((c) => hasWord(t, c));
  const eligibleCountry = ELIGIBLE_NAMES.find((c) => hasWord(t, c));

  // "Città, XX" con XX sigla di uno stato USA (es. "Austin, TX", "Dublin, OH")
  const stateMatch = original.match(/,\s*([A-Z]{2})\b(?!\s*[a-z])/);
  if (stateMatch && US_STATES[stateMatch[1]]) {
    const code = stateMatch[1];
    if (!AMBIGUOUS_CODES.has(code)) return { cls: "ineligible", label: `USA (${code})` };
    // DE / MT: decide la città, se nota
    if (eligibleCity) return { cls: "eligible", label: eligibleCity };
    if (BAD_CITIES.some((c) => hasWord(t, c))) return { cls: "ineligible", label: `USA (${code})` };
  }

  // Codice ISO di paese idoneo come segmento a sé ("Milan, IT", "Remote - DE")
  const codeSeg = original.split(/[,\-–/|()]/).map((s) => s.trim());
  const eligibleCode = codeSeg.find((s) => ELIGIBLE_CODES.has(s) && !(US_STATES[s] && !AMBIGUOUS_CODES.has(s)));

  if (eligibleCity || eligibleCountry) return { cls: "eligible", label: eligibleCity ?? eligibleCountry ?? "" };
  if (eligibleCode) return { cls: "eligible", label: eligibleCode };

  const okRegion = OK_REGIONS.find((r) => hasWord(t, r));
  if (okRegion) return { cls: "region_ok", label: okRegion };

  const bad =
    BAD_CITIES.find((c) => hasWord(t, c)) ??
    BAD_COUNTRIES.find((c) => hasWord(t, c)) ??
    US_STATE_NAMES.find((s) => hasWord(t, s)) ??
    BAD_REGIONS.find((r) => hasWord(t, r));
  if (bad) return { cls: "ineligible", label: bad };

  return { cls: "unknown", label: "" };
}

/** Frasi che rendono l'offerta di fatto riservata a residenti/cittadini di altri paesi. */
const RESTRICTIVE_PHRASES: RegExp[] = [
  /must (?:be )?(?:physically )?(?:located|based|residing|reside|live|living) (?:in|within) (?:the )?(?:us\b|u\.s\.|usa|united states|canada|uk\b|united kingdom|north america|latam|latin america|india|australia)/,
  /(?:authori[sz]ed|eligible|legally (?:authori[sz]ed|able|permitted)|permission) to work (?:in|for) (?:the )?(?:us\b|u\.s\.|usa|united states|canada|uk\b|united kingdom|australia)/,
  /\b(?:us|u\.s\.) (?:work )?authori[sz]ation (?:is )?required/,
  /security clearance|active (?:secret|top secret|ts\/sci) clearance|\bts\/sci\b|clearance (?:is )?required|obtain (?:and maintain )?a (?:security )?clearance/,
  /\b(?:us|u\.s\.) citizen(?:s|ship)? (?:only|is required|required)|must be an? (?:us|u\.s\.) citizen|green card holder/,
  /(?:only|exclusively) (?:open to|hiring|accepting|considering)(?: applications from)?(?: candidates)? (?:who are )?(?:based |located |residing )?(?:in|from) (?:the )?(?:us\b|u\.s\.|usa|united states|canada|uk\b|latam|latin america|north america|apac|asia|india)/,
  /\b(?:us|usa|u\.s\.)[- ]only\b|\b(?:us|usa)[- ]based (?:candidates )?only/,
  /(?:remote|anywhere) (?:in|within|across) the (?:us\b|u\.s\.|united states|continental us)/,
  /this (?:position|role|job) is (?:only )?open to (?:candidates|residents) (?:in|of) (?:the )?(?:us\b|u\.s\.|united states|canada|uk\b)/,
];

const VISA_POSITIVE =
  /visa sponsorship (?:is )?(?:available|provided|offered|possible)|(?:we|will|can|able to) (?:provide |offer )?sponsor(?:ship)? (?:your |a |the )?(?:work )?(?:visa|permit)|sponsor(?:ing)? visas|visa support|support (?:with|for) (?:your )?(?:work )?visa|visa assistance|relocation (?:and|&) visa|visa (?:and|&) relocation|offer(?:s)? visa sponsorship|sponsorship available/;
const VISA_NEGATIVE =
  /(?:no|not|unable to|cannot|can't|can ?not|do not|don't|won't|will not|are not able to)(?: currently)?(?: provide| offer| support)? (?:visa |work )?sponsor|sponsorship (?:is )?not (?:available|provided|offered|possible)|without (?:the need for )?(?:visa )?sponsorship|no visa|not (?:eligible|able) for (?:visa )?sponsorship|keine visa/;

export function visaStatus(job: Pick<Job, "description" | "visaSponsorship">): "yes" | "no" | "unknown" {
  const d = normalize(job.description);
  if (VISA_NEGATIVE.test(d)) return "no";
  if (job.visaSponsorship === true || VISA_POSITIVE.test(d)) return "yes";
  if (job.visaSponsorship === false) return "no";
  return "unknown";
}

export interface GeoResult {
  ok: boolean;
  reason?: "geografia" | "modalita";
  detail?: string;
}

/** Fuso orario compatibile con l'Italia (UTC+1/+2) con un margine. */
function tzCompatible(tz: number[]): boolean {
  return tz.some((o) => o >= -1 && o <= 4);
}

export function checkGeo(job: Job, prefs: Preferences): GeoResult {
  // Modalità di lavoro preferite
  if (job.workMode !== "unknown" && prefs.workModes.length && !prefs.workModes.includes(job.workMode)) {
    return { ok: false, reason: "modalita", detail: `Modalità ${job.workMode} non tra le preferite` };
  }

  const desc = normalize(job.description);
  const phrase = RESTRICTIVE_PHRASES.find((re) => re.test(desc));
  if (phrase) {
    const m = desc.match(phrase)?.[0] ?? "";
    return { ok: false, reason: "geografia", detail: `Restrizione: "${m.slice(0, 80)}"` };
  }

  const places = Array.from(new Set([...job.locationRestrictions, job.location].map((s) => s?.trim()).filter(Boolean)));
  const classes = places.map(classifyPlace);
  const hasEligible = classes.some((c) => c.cls === "eligible");
  const hasRegionOk = classes.some((c) => c.cls === "region_ok");
  const ineligible = classes.filter((c) => c.cls === "ineligible");

  if (job.timezoneRestrictions.length && !tzCompatible(job.timezoneRestrictions) && !hasEligible) {
    return {
      ok: false,
      reason: "geografia",
      detail: `Fusi orari richiesti: UTC${job.timezoneRestrictions.map((n) => (n >= 0 ? `+${n}` : n)).join(", ")}`,
    };
  }

  if (job.workMode === "remote") {
    if (hasEligible || hasRegionOk) return { ok: true };
    if (ineligible.length) {
      return { ok: false, reason: "geografia", detail: `Remoto solo da: ${ineligible.map((c) => c.label).join(", ")}` };
    }
    return { ok: true };
  }

  // In sede / ibrido / sconosciuto
  if (hasEligible) {
    const italy = classes.some((c) => c.cls === "eligible" && isItaly(c.label));
    if (!italy && !prefs.willingToRelocate && job.workMode !== "unknown") {
      return { ok: false, reason: "geografia", detail: "Richiede trasferimento (non disponibile)" };
    }
    return { ok: true };
  }
  if (ineligible.length) {
    if (!prefs.willingToRelocate) {
      return { ok: false, reason: "geografia", detail: "Richiede trasferimento fuori UE (non disponibile)" };
    }
    const visa = visaStatus(job);
    if (visa === "yes") return { ok: true };
    return {
      ok: false,
      reason: "geografia",
      detail:
        visa === "no"
          ? `Fuori UE (${ineligible[0].label}) e senza sponsor del visto`
          : `Fuori UE (${ineligible[0].label}), non parla di sponsor del visto`,
    };
  }
  return { ok: true };
}

const ITALY_TERMS = new Set([
  "IT", "italy", "italia", "italien", "italie", "milan", "milano", "rome", "roma", "turin", "torino", "bologna",
  "florence", "firenze", "naples", "napoli", "genoa", "genova", "padua", "padova", "verona", "bari", "palermo",
  "trieste", "bergamo", "brescia", "venice", "venezia", "catania", "cagliari", "pisa", "modena", "parma", "trento",
  "bolzano",
]);
function isItaly(label: string) {
  return ITALY_TERMS.has(label);
}

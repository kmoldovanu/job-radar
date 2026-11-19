import { z } from "zod";
import {
  aiEvaluationSchema, CV_LANGS, LANGUAGE_LEVELS, tailoredCvSchema, type AiEvaluation, type CvIndex, type CvLang,
  type Profile, type TailoredCv,
} from "../types";
import { structuredCall } from "./client";
import { guardLetter, guardTailoredCv } from "./guard";

/* ------------------------------------------------------------------ */
/* 1. CV caricato → profilo strutturato                                */
/* ------------------------------------------------------------------ */

const extractedProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  links: z.array(z.string()),
  summary: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({ institution: z.string(), degree: z.string(), start: z.string(), end: z.string(), details: z.string() }),
  ),
  skills: z.array(z.string()),
  certifications: z.array(z.string()),
  languages: z.array(z.object({ name: z.string(), code: z.string(), level: z.enum(LANGUAGE_LEVELS) })),
  projects: z.array(z.object({ name: z.string(), description: z.string(), bullets: z.array(z.string()) })),
  yearsExperience: z.number(),
  seniority: z.enum(["junior", "mid", "senior", "lead"]),
  // indice per la ricerca: è quello che fa trovare le offerte giuste
  searchTitles: z.array(z.string()),
  skillIndex: z.array(z.object({ name: z.string(), aliases: z.array(z.string()), weight: z.number() })),
  domains: z.array(z.string()),
  keywords: z.array(z.string()),
});

export async function extractProfile(cvText: string, model: string, previous: Profile, now = new Date()): Promise<Profile> {
  const out = await structuredCall({
    model,
    maxTokens: 16000,
    effort: "low",
    system:
      "Estrai i dati da un curriculum in un JSON strutturato. Copia i contenuti fedelmente, senza inventare, " +
      "senza aggiungere competenze o risultati che non sono scritti. Mantieni la lingua originale dei testi. " +
      "Date nel formato del CV (es. '03/2021' o '2021'); end vuoto se è il lavoro attuale. " +
      "Per le lingue: code ISO 639-1, level CEFR (A1..C2) o 'native' per la madrelingua; se il livello non è indicato stimalo da parole come 'fluente' (C1), 'buono' (B2), 'scolastico' (A2). " +
      "yearsExperience: anni totali di esperienza professionale (numero intero). " +
      "seniority: junior (0-2 anni), mid (3-5), senior (6+), lead (guida persone o team). " +
      "Poi costruisci l'INDICE DI RICERCA, che serve a trovare offerte adatte su siti di lavoro internazionali: " +
      "searchTitles: 6-10 titoli di lavoro realistici per cui questo CV verrebbe chiamato a colloquio, dal più adatto; " +
      "prima i titoli standard in inglese come compaiono negli annunci (es. 'Data Analyst', 'Backend Engineer'), poi 1-3 nella lingua del CV; " +
      "includi le varianti vicine (ruoli adiacenti per cui l'esperienza è trasferibile), non ruoli troppo senior o fuori campo; niente seniority nei titoli. " +
      "skillIndex: 10-30 competenze concrete del CV (strumenti, tecnologie, metodi, normative, lingue di programmazione, software, competenze di dominio); " +
      "name come nel CV; aliases: sinonimi, sigle e traduzioni in inglese e italiano con cui la stessa competenza compare negli annunci " +
      "(es. 'Gestione progetti' → ['project management', 'PM']; 'Contabilità' → ['accounting', 'bookkeeping']); " +
      "weight: 3 se è centrale nel lavoro descritto, 2 se usata, 1 se solo citata. Niente soft skill generiche (comunicazione, problem solving). " +
      "domains: 2-6 settori o domìni in cui il candidato ha lavorato, in inglese (es. 'fintech', 'logistics', 'e-commerce'). " +
      "keywords: 5-15 altre parole chiave distintive del CV in inglese, come le scriverebbe un annuncio (certificazioni, metodologie, tipi di prodotto).",
    user: `<cv>\n${cvText.slice(0, 60000)}\n</cv>`,
    schema: extractedProfileSchema,
  });
  const { searchTitles, skillIndex, domains, keywords, yearsExperience, seniority, ...rest } = out;
  const clean = (l: string[]) => [...new Set(l.map((x) => x.trim()).filter(Boolean))];
  const cvIndex: CvIndex = {
    titles: clean(searchTitles).slice(0, 12),
    skills: skillIndex
      .filter((s) => s.name.trim())
      .slice(0, 40)
      .map((s) => ({ name: s.name.trim(), aliases: clean(s.aliases).slice(0, 8), weight: Math.max(1, Math.min(3, Math.round(s.weight) || 2)) })),
    domains: clean(domains).slice(0, 8),
    keywords: clean(keywords).slice(0, 20),
    source: "ai",
    builtAt: now.toISOString(),
  };
  return {
    ...rest,
    // i ruoli scritti a mano restano: si aggiungono ai titoli del CV, non li sostituiscono
    preferences: {
      ...previous.preferences,
      yearsExperience: Math.max(0, Math.round(yearsExperience)),
      seniority,
    },
    cvIndex,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Valutazione di una singola offerta                              */
/* ------------------------------------------------------------------ */

export interface JobForAi {
  title: string;
  company: string;
  location: string;
  workMode: string;
  description: string;
  salary: string | null;
}

export function profileForPrompt(p: Profile): string {
  // l'indice di ricerca non serve all'AI: è già tutto nel CV
  const { preferences, cvIndex: _index, ...cv } = p;
  return JSON.stringify({ ...cv, preferences }, null, 1);
}

/** Cosa cerca il candidato (le preferenze), in breve: il resto lo dice il CV. */
function preferencesForPrompt(p: Profile): string {
  const pr = p.preferences;
  const modes = { remote: "remoto", hybrid: "ibrido", onsite: "in sede" } as const;
  return [
    `Ruoli che cerca: ${[...(p.cvIndex?.titles ?? []).slice(0, 6), ...pr.targetRoles].join(", ") || "n/d"}`,
    `Modalità: ${pr.workModes.map((m) => modes[m]).join(", ")}; trasferimento all'estero: ${pr.willingToRelocate ? "sì" : "no"}`,
    `Esperienza: ${pr.yearsExperience} anni, livello ${pr.seniority}`,
    `Lingue: ${p.languages.map((l) => `${l.name} ${l.level}`).join(", ") || "n/d"}`,
  ].join("\n");
}

export async function evaluateJob(job: JobForAi, profile: Profile, model: string, cvText = ""): Promise<AiEvaluation> {
  // Il CV originale va nel system prompt, uguale per tutte le offerte: con la cache del prompt costa poco.
  // Se manca il testo originale (profilo compilato a mano) si usa il CV master strutturato.
  const cv = cvText.trim().length >= 200 ? cvText.slice(0, 30000) : profileForPrompt(profile);
  const ev = await structuredCall({
    model,
    maxTokens: 4000,
    effort: "low",
    system:
      "Sei un recruiter esperto, severo e onesto. Valuta quanto il candidato ha chance CONCRETE di essere chiamato a colloquio per l'offerta. " +
      "Basa la valutazione sul CV del candidato: esperienze reali, risultati, competenze, formazione. " +
      "Il CV e l'annuncio possono essere in lingue diverse: riconosci sinonimi, traduzioni e titoli equivalenti " +
      "(es. 'sviluppatore' = 'developer', 'responsabile amministrativo' = 'finance manager') e le competenze trasferibili da ruoli vicini. " +
      "Il candidato è cittadino UE e vive in Italia. Considera requisiti obbligatori, seniority, anni di esperienza, lingue, idoneità geografica. " +
      "I requisiti 'nice to have' / 'preferred' / 'a plus' non sono obbligatori: se mancano abbassano poco il punteggio. " +
      "Scala: 85-100 soddisfa tutti i requisiti obbligatori e ha esperienza diretta nel ruolo; 65-84 soddisfa quasi tutto; " +
      "45-64 profilo affine con qualche lacuna colmabile; 20-44 mancano requisiti chiave; sotto 20 ruolo di un altro mestiere. " +
      "score: intero 0-100. chance: alta (≥65), media (40-64), bassa (<40). summary: 2-3 frasi in italiano, concrete, che citano il CV. " +
      "strengths, gaps (cosa manca), obstacles (ostacoli pratici: lingua, visto, sede, fuso orario…): elenchi brevi in italiano. " +
      `applicationLanguage: lingua in cui va scritta la candidatura (quella dell'annuncio), uno tra ${CV_LANGS.join(", ")}. ` +
      "keywords: 5-12 parole chiave dell'annuncio utili per l'ATS.",
    cachedContext: `<cv_candidato>\n${cv}\n</cv_candidato>\n\n<cosa_cerca>\n${preferencesForPrompt(profile)}\n</cosa_cerca>`,
    user: `<offerta>\nTitolo: ${job.title}\nAzienda: ${job.company}\nLuogo: ${job.location} (${job.workMode})\nStipendio: ${job.salary ?? "n/d"}\n\n${job.description.slice(0, 15000)}\n</offerta>`,
    schema: aiEvaluationSchema,
  });
  return { ...ev, score: Math.max(0, Math.min(100, Math.round(ev.score))) };
}

/* ------------------------------------------------------------------ */
/* 3. CV + lettera su misura                                          */
/* ------------------------------------------------------------------ */

const tailorOutputSchema = z.object({
  cv: tailoredCvSchema,
  letter: z.string(),
});

export interface TailorResult {
  cv: TailoredCv;
  letter: string;
  corrections: string[];
  language: CvLang;
}

export async function tailorApplication(
  job: JobForAi,
  profile: Profile,
  language: CvLang,
  keywords: string[],
  model: string,
): Promise<TailorResult> {
  const out = await structuredCall({
    model,
    maxTokens: 12000,
    effort: "medium",
    system: [
      "Prepari un CV e una lettera di presentazione su misura per un'offerta di lavoro.",
      "REGOLA ASSOLUTA: puoi solo SELEZIONARE, RIORDINARE, RIFORMULARE e TRADURRE contenuti presenti nel CV master.",
      "È vietato inventare: aziende, ruoli, date, titoli di studio, certificazioni, competenze, numeri, percentuali, risultati, clienti, tecnologie.",
      "Se un requisito dell'annuncio non è nel master, NON aggiungerlo: semplicemente non citarlo.",
      "Usa esattamente i nomi delle aziende e le date del master. Scrivi le competenze con gli stessi nomi del master.",
      "Ogni numero o metrica nei punti elenco deve comparire identico nel master.",
      `Scrivi tutto nella lingua con codice "${language}".`,
      "CV: una colonna, adatto agli ATS. headline e summary orientati all'offerta; esperienze in ordine cronologico inverso;",
      "per ogni esperienza 2-5 punti elenco, i più pertinenti per l'offerta; usa le parole chiave dell'annuncio solo dove sono vere.",
      "Le esperienze non pertinenti puoi accorciarle ma non toglierle se lasciano buchi di date.",
      "Lettera: 200-320 parole, tono professionale e concreto, niente frasi fatte; saluto e firma col nome del candidato; nessun indirizzo inventato.",
      "Riporta nome, email, telefono e link esattamente come nel master.",
    ].join("\n"),
    user: `<cv_master>\n${profileForPrompt(profile)}\n</cv_master>\n\n<parole_chiave>${keywords.join(", ")}</parole_chiave>\n\n<offerta>\nTitolo: ${job.title}\nAzienda: ${job.company}\nLuogo: ${job.location}\n\n${job.description.slice(0, 15000)}\n</offerta>`,
    schema: tailorOutputSchema,
  });

  const cvGuard = guardTailoredCv({ ...out.cv, language }, profile);
  const letterGuard = guardLetter(out.letter, profile, `${job.title}\n${job.description}`);
  return {
    cv: cvGuard.cv,
    letter: letterGuard.letter,
    corrections: [...cvGuard.corrections, ...letterGuard.corrections],
    language,
  };
}

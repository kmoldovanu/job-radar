import { z } from "zod";
import {
  aiEvaluationSchema, CV_LANGS, LANGUAGE_LEVELS, tailoredCvSchema, type AiEvaluation, type CvLang, type Profile,
  type TailoredCv,
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
  suggestedRoles: z.array(z.string()),
  yearsExperience: z.number(),
  seniority: z.enum(["junior", "mid", "senior", "lead"]),
});

export async function extractProfile(cvText: string, model: string, previous: Profile): Promise<Profile> {
  const out = await structuredCall({
    model,
    maxTokens: 16000,
    effort: "low",
    system:
      "Estrai i dati da un curriculum in un JSON strutturato. Copia i contenuti fedelmente, senza inventare, " +
      "senza aggiungere competenze o risultati che non sono scritti. Mantieni la lingua originale dei testi. " +
      "Date nel formato del CV (es. '03/2021' o '2021'); end vuoto se è il lavoro attuale. " +
      "Per le lingue: code ISO 639-1, level CEFR (A1..C2) o 'native' per la madrelingua; se il livello non è indicato stimalo da parole come 'fluente' (C1), 'buono' (B2), 'scolastico' (A2). " +
      "suggestedRoles: 3-5 titoli di lavoro in inglese adatti al profilo, da usare come parole chiave di ricerca. " +
      "yearsExperience: anni totali di esperienza professionale (numero intero).",
    user: `<cv>\n${cvText.slice(0, 60000)}\n</cv>`,
    schema: extractedProfileSchema,
  });
  const { suggestedRoles, yearsExperience, seniority, ...rest } = out;
  return {
    ...rest,
    preferences: {
      ...previous.preferences,
      targetRoles: previous.preferences.targetRoles.length ? previous.preferences.targetRoles : suggestedRoles,
      yearsExperience: Math.max(0, Math.round(yearsExperience)),
      seniority,
    },
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
  const { preferences, ...cv } = p;
  return JSON.stringify({ ...cv, preferences }, null, 1);
}

export async function evaluateJob(job: JobForAi, profile: Profile, model: string): Promise<AiEvaluation> {
  const ev = await structuredCall({
    model,
    maxTokens: 4000,
    effort: "low",
    system:
      "Sei un recruiter severo e onesto. Valuta quanto il candidato ha chance CONCRETE di essere chiamato a colloquio per questa offerta. " +
      "Il candidato è cittadino UE e vive in Italia. Considera requisiti obbligatori, seniority, anni di esperienza, lingue, idoneità geografica. " +
      "Non gonfiare il punteggio: 80+ solo se soddisfa quasi tutti i requisiti obbligatori; sotto 40 se mancano requisiti chiave. " +
      "score: intero 0-100. chance: alta/media/bassa. summary: 2-3 frasi in italiano. " +
      "strengths, gaps (cosa manca), obstacles (ostacoli pratici: lingua, visto, sede, fuso orario…): elenchi brevi in italiano. " +
      `applicationLanguage: lingua in cui va scritta la candidatura (quella dell'annuncio), uno tra ${CV_LANGS.join(", ")}. ` +
      "keywords: 5-12 parole chiave dell'annuncio utili per l'ATS.",
    user: `<candidato>\n${profileForPrompt(profile)}\n</candidato>\n\n<offerta>\nTitolo: ${job.title}\nAzienda: ${job.company}\nLuogo: ${job.location} (${job.workMode})\nStipendio: ${job.salary ?? "n/d"}\n\n${job.description.slice(0, 15000)}\n</offerta>`,
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

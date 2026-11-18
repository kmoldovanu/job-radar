import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Offerta normalizzata: tutte le fonti producono questo tipo          */
/* ------------------------------------------------------------------ */

export type SourceId =
  | "himalayas"
  | "remoteok"
  | "jobicy"
  | "jooble"
  | "themuse"
  | "arbeitnow"
  | "adzuna"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "manual";

export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export interface Job {
  /** id stabile: `${source}:${externalId}` */
  id: string;
  source: SourceId;
  externalId: string;
  title: string;
  company: string;
  /** testo libero della località, es. "Berlin, Germany" o "Remote - EMEA" */
  location: string;
  /** restrizioni di località per i lavori remoti (se la fonte le fornisce) */
  locationRestrictions: string[];
  /** offset di fuso orario ammessi, se la fonte li fornisce (es. [-5, -8]) */
  timezoneRestrictions: number[];
  workMode: WorkMode;
  /** testo semplice (HTML già rimosso) */
  description: string;
  /** link per candidarsi / aprire l'annuncio */
  url: string;
  /** link all'annuncio sulla fonte (per l'attribuzione "via <fonte>") */
  sourceUrl: string;
  postedAt: Date | null;
  salary: string | null;
  tags: string[];
  /** true/false se la fonte lo dichiara esplicitamente, null se non noto */
  visaSponsorship: boolean | null;
}

export const SOURCE_LABELS: Record<SourceId, { name: string; home: string }> = {
  himalayas: { name: "Himalayas", home: "https://himalayas.app" },
  remoteok: { name: "Remote OK", home: "https://remoteok.com" },
  jobicy: { name: "Jobicy", home: "https://jobicy.com" },
  jooble: { name: "Jooble", home: "https://jooble.org" },
  themuse: { name: "The Muse", home: "https://www.themuse.com" },
  arbeitnow: { name: "Arbeitnow", home: "https://www.arbeitnow.com" },
  adzuna: { name: "Adzuna", home: "https://www.adzuna.com" },
  greenhouse: { name: "Greenhouse", home: "https://www.greenhouse.com" },
  lever: { name: "Lever", home: "https://www.lever.co" },
  ashby: { name: "Ashby", home: "https://www.ashbyhq.com" },
  manual: { name: "Inserita a mano", home: "" },
};

/* ------------------------------------------------------------------ */
/* CV master (profilo strutturato)                                    */
/* ------------------------------------------------------------------ */

export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "native"] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  details: z.string().default(""),
});

export const spokenLanguageSchema = z.object({
  name: z.string(),
  /** codice ISO 639-1, es. "it", "en", "de" */
  code: z.string().default(""),
  level: z.enum(LANGUAGE_LEVELS).default("B2"),
});

export const projectSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const preferencesSchema = z.object({
  targetRoles: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  workModes: z.array(z.enum(["remote", "hybrid", "onsite"])).default(["remote", "hybrid", "onsite"]),
  willingToRelocate: z.boolean().default(true),
  yearsExperience: z.number().default(0),
  seniority: z.enum(["junior", "mid", "senior", "lead"]).default("mid"),
});

export const profileSchema = z.object({
  name: z.string().default(""),
  headline: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  links: z.array(z.string()).default([]),
  summary: z.string().default(""),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  languages: z.array(spokenLanguageSchema).default([]),
  projects: z.array(projectSchema).default([]),
  preferences: preferencesSchema.default(preferencesSchema.parse({})),
});

export type Profile = z.infer<typeof profileSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;

export const emptyProfile = (): Profile => profileSchema.parse({});

/* ------------------------------------------------------------------ */
/* CV su misura                                                        */
/* ------------------------------------------------------------------ */

export const CV_LANGS = ["en", "it", "de", "fr", "es", "nl", "pt"] as const;
export type CvLang = (typeof CV_LANGS)[number];

export const tailoredCvSchema = z.object({
  language: z.enum(CV_LANGS),
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  links: z.array(z.string()),
  summary: z.string(),
  // schemi senza default: vengono usati come formato di output strutturato dell'AI
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
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  projects: z.array(z.object({ name: z.string(), description: z.string(), bullets: z.array(z.string()) })),
});
export type TailoredCv = z.infer<typeof tailoredCvSchema>;

/* ------------------------------------------------------------------ */
/* Valutazione AI                                                      */
/* ------------------------------------------------------------------ */

export const aiEvaluationSchema = z.object({
  score: z.number(),
  chance: z.enum(["alta", "media", "bassa"]),
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  obstacles: z.array(z.string()),
  applicationLanguage: z.enum(CV_LANGS),
  keywords: z.array(z.string()),
});
export type AiEvaluation = z.infer<typeof aiEvaluationSchema>;

/* ------------------------------------------------------------------ */
/* Filtri                                                              */
/* ------------------------------------------------------------------ */

export type RejectReason =
  | "vecchio"
  | "truffa"
  | "geografia"
  | "lingua"
  | "modalita"
  | "parola_esclusa"
  | "match_basso"
  | "duplicato";

export const REJECT_LABELS: Record<RejectReason, string> = {
  vecchio: "Troppo vecchie",
  truffa: "Sospette / senza azienda",
  geografia: "Non idonee per località o visto",
  lingua: "Lingua richiesta che non parli",
  modalita: "Modalità di lavoro non desiderata",
  parola_esclusa: "Contengono parole escluse",
  match_basso: "Match troppo basso",
  duplicato: "Duplicati o già viste",
};

export interface MatchDetails {
  score: number;
  titleScore: number;
  skillsFound: string[];
  jobSeniority: string | null;
  yearsRequired: number | null;
  notes: string[];
}

/* ------------------------------------------------------------------ */
/* Impostazioni                                                        */
/* ------------------------------------------------------------------ */

export const ADZUNA_COUNTRIES = [
  "gb", "us", "de", "fr", "it", "nl", "es", "at", "be", "ch", "pl",
  "ca", "au", "nz", "sg", "in", "mx", "br", "za",
] as const;

export const settingsSchema = z.object({
  sources: z
    .object({
      himalayas: z.boolean().default(true),
      remoteok: z.boolean().default(true),
      jobicy: z.boolean().default(true),
      jooble: z.boolean().default(true),
      themuse: z.boolean().default(true),
      arbeitnow: z.boolean().default(true),
      adzuna: z.boolean().default(true),
      companies: z.boolean().default(true),
    })
    .default({ himalayas: true, remoteok: true, jobicy: true, jooble: true, themuse: true, arbeitnow: true, adzuna: true, companies: true }),
  adzunaCountries: z.array(z.enum(ADZUNA_COUNTRIES)).default(["de", "nl", "fr", "es", "at", "be", "ch", "gb", "it"]),
  /** una richiesta Jooble per località a ogni ricerca (la chiave gratuita ha richieste limitate) */
  joobleLocations: z.array(z.string()).default(["Remote", "Italy", "Germany", "Netherlands"]),
  maxAgeDays: z.number().int().min(1).max(90).default(21),
  minQuickScore: z.number().int().min(0).max(100).default(25),
  aiEvaluateTop: z.number().int().min(0).max(100).default(40),
  prepareCount: z.number().int().min(1).max(30).default(5),
  followUpDays: z.number().int().min(1).max(60).default(10),
  evalModel: z.string().default("claude-haiku-5-5"),
  writeModel: z.string().default("claude-sonnet-5-5"),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings = (): Settings => settingsSchema.parse({});

export const APPLICATION_STATUSES = ["inviata", "colloquio", "offerta", "rifiutato"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

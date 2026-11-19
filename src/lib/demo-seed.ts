import "server-only";
import { getDemoDb, schema } from "./db";
import { ensureCvColumns } from "./db/ensure";
import { quickMatch } from "./filters/match";
import { dedupeKey } from "./sources/util";
import { defaultSettings, type AiEvaluation, type MatchDetails, type Profile, type TailoredCv } from "./types";

/*
 * Dati di esempio della demo. Persona e aziende sono inventate; i link puntano alle home delle fonti.
 * Le date sono relative al momento del caricamento, così le offerte sembrano sempre fresche.
 */

const { jobs, profile, settings, applications, tailored, companies } = schema;

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);

const demoProfile: Profile = {
  name: "Giulia Ferrero",
  headline: "Sviluppatrice web full-stack",
  email: "giulia.ferrero@example.com",
  phone: "",
  location: "Torino, Italia",
  links: ["github.com/esempio"],
  summary:
    "Sviluppatrice full-stack con 3 anni di esperienza su applicazioni web aziendali. Backend in Python e Django, frontend in React e TypeScript, deploy su Linux.",
  experience: [
    {
      company: "Officina Digitale Srl",
      role: "Sviluppatrice web full-stack",
      location: "Torino",
      start: "2023-02",
      end: "",
      bullets: [
        "Sviluppo di 3 applicazioni gestionali in Django e React usate ogni giorno da circa 200 persone.",
        "API REST con Django REST Framework e interfacce React con TypeScript.",
        "Deploy e manutenzione di server Debian con Nginx e PostgreSQL.",
      ],
    },
    {
      company: "Officina Digitale Srl",
      role: "Stagista sviluppo web",
      location: "Torino",
      start: "2022-09",
      end: "2023-01",
      bullets: ["Correzione di bug e piccole funzionalità in Django, HTML e CSS."],
    },
  ],
  education: [
    { institution: "ITIS Avogadro", degree: "Diploma in Informatica", start: "2017", end: "2022", details: "" },
  ],
  skills: ["Python", "Django", "Django REST Framework", "React", "TypeScript", "JavaScript", "PostgreSQL", "htmx", "Linux", "Git"],
  certifications: [],
  languages: [
    { name: "Italiano", code: "it", level: "native" },
    { name: "Inglese", code: "en", level: "C1" },
    { name: "Tedesco", code: "de", level: "A2" },
  ],
  projects: [
    { name: "Gestionale ordini", description: "App interna per ordini e magazzino.", bullets: ["Django, htmx e PostgreSQL."] },
  ],
  preferences: {
    targetRoles: ["Full-stack Developer", "Backend Developer", "Python Developer"],
    excludeKeywords: ["senior staff", "principal"],
    workModes: ["remote", "hybrid", "onsite"],
    willingToRelocate: true,
    yearsExperience: 3,
    seniority: "mid",
  },
  cvIndex: {
    titles: ["Full-stack Developer", "Backend Developer", "Python Developer", "Django Developer", "Web Developer", "Sviluppatrice web"],
    skills: [
      { name: "Python", aliases: [], weight: 3 },
      { name: "Django", aliases: ["Django REST Framework", "DRF"], weight: 3 },
      { name: "React", aliases: ["React.js", "ReactJS"], weight: 3 },
      { name: "TypeScript", aliases: ["TS"], weight: 2 },
      { name: "JavaScript", aliases: ["JS"], weight: 2 },
      { name: "PostgreSQL", aliases: ["Postgres", "SQL"], weight: 2 },
      { name: "API REST", aliases: ["REST API", "RESTful"], weight: 2 },
      { name: "Linux", aliases: ["Debian"], weight: 2 },
      { name: "Nginx", aliases: [], weight: 1 },
      { name: "htmx", aliases: [], weight: 1 },
      { name: "Git", aliases: [], weight: 1 },
    ],
    domains: ["business software", "internal tools"],
    keywords: ["full-stack", "web applications", "deployment"],
    source: "ai",
    builtAt: "2026-11-01T08:00:00.000Z",
  },
};

type DemoJob = {
  id: string;
  source: "himalayas" | "remoteok" | "jobicy" | "arbeitnow" | "adzuna" | "themuse" | "greenhouse";
  title: string;
  company: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  daysAgo: number;
  salary?: string;
  tags: string[];
  lang: "en" | "it" | "de";
  quick: number;
  ai?: Omit<AiEvaluation, "keywords" | "applicationLanguage">;
  status?: "new" | "applied" | "dismissed";
  seen?: boolean;
  description: string;
};

const HOME: Record<DemoJob["source"], string> = {
  himalayas: "https://himalayas.app",
  remoteok: "https://remoteok.com",
  jobicy: "https://jobicy.com",
  arbeitnow: "https://www.arbeitnow.com",
  adzuna: "https://www.adzuna.com",
  themuse: "https://www.themuse.com",
  greenhouse: "https://www.greenhouse.com",
};

const demoJobs: DemoJob[] = [
  {
    id: "demo-1", source: "himalayas", title: "Full-stack Developer (Django + React)", company: "Northwind Labs",
    location: "Remoto, Europa", workMode: "remote", daysAgo: 0.2, salary: "45–55k €", tags: ["Django", "React", "PostgreSQL"],
    lang: "en", quick: 86,
    ai: { score: 88, chance: "alta", summary: "Stack quasi identico al tuo: Django in produzione, React sul frontend e deploy su Linux.", strengths: ["Django in produzione da 3 anni", "React e TypeScript", "Deploy su server Linux"], gaps: ["Celery per i job in background"], obstacles: [] },
    description: "We are looking for a full-stack developer to build our logistics platform with Django, Django REST Framework and React. You will own features end to end, from the data model to the UI. Fully remote within Europe.",
  },
  {
    id: "demo-2", source: "arbeitnow", title: "Backend Engineer Python", company: "Brightfield",
    location: "Berlino, Germania", workMode: "hybrid", daysAgo: 1, tags: ["Python", "Django", "Docker"], lang: "en", quick: 78,
    ai: { score: 81, chance: "alta", summary: "Cercano Python e Django con esperienza di deploy; offrono supporto per il trasferimento.", strengths: ["Python e Django", "Esperienza con server Linux"], gaps: ["Docker in produzione", "Kubernetes"], obstacles: [] },
    description: "Brightfield builds energy analytics for utilities. Join our backend team working with Python, Django and PostgreSQL. Relocation support to Berlin available. English is our working language.",
  },
  {
    id: "demo-3", source: "adzuna", title: "Sviluppatore Web Full-stack", company: "Studio Altavia",
    location: "Torino", workMode: "onsite", daysAgo: 2, salary: "32–38k €", tags: ["Django", "htmx", "JavaScript"], lang: "it", quick: 82,
    ai: { score: 76, chance: "media", summary: "Stack in linea (Django e htmx), ma chiedono 4 anni di esperienza.", strengths: ["htmx e Django", "Stessa città"], gaps: ["4 anni richiesti, ne hai 3"], obstacles: [] },
    description: "Cerchiamo uno sviluppatore web full-stack per progetti Django con htmx per clienti del settore manifatturiero. Richiesti 4 anni di esperienza.",
  },
  {
    id: "demo-4", source: "remoteok", title: "Frontend Developer React / TypeScript", company: "Kitepath",
    location: "Remoto, worldwide", workMode: "remote", daysAgo: 3, tags: ["React", "TypeScript", "Next.js"], lang: "en", quick: 70,
    ai: { score: 69, chance: "media", summary: "Buon match su React e TypeScript, ma il ruolo è solo frontend.", strengths: ["React", "TypeScript"], gaps: ["Test end-to-end", "Next.js in produzione"], obstacles: [] },
    description: "Kitepath is hiring a frontend developer to work on our travel booking app built with React, TypeScript and Next.js.",
  },
  {
    id: "demo-5", source: "themuse", title: "Junior Software Engineer", company: "Lumen Systems",
    location: "Amsterdam, Paesi Bassi", workMode: "hybrid", daysAgo: 4, tags: ["Python", "SQL"], lang: "en", quick: 64,
    description: "Lumen Systems is looking for a junior software engineer to join the data platform team. Python and SQL required.",
  },
  {
    id: "demo-6", source: "jobicy", title: "Python Developer", company: "Quarry Analytics",
    location: "Remoto, EMEA", workMode: "remote", daysAgo: 5, tags: ["Python", "FastAPI", "PostgreSQL"], lang: "en", quick: 74,
    ai: { score: 72, chance: "media", summary: "Python e PostgreSQL in linea; usano FastAPI invece di Django.", strengths: ["Python", "PostgreSQL"], gaps: ["FastAPI"], obstacles: [] },
    seen: true,
    description: "Build data APIs with Python, FastAPI and PostgreSQL for our analytics product. Remote across EMEA time zones.",
  },
  {
    id: "demo-7", source: "greenhouse", title: "Software Engineer, Platform", company: "Harbor & Co",
    location: "Monaco, Germania", workMode: "onsite", daysAgo: 6, tags: ["Go", "Kubernetes"], lang: "de", quick: 41,
    ai: { score: 34, chance: "bassa", summary: "Il ruolo è su Go e Kubernetes e l'annuncio chiede tedesco fluente.", strengths: ["Esperienza con server Linux"], gaps: ["Go", "Kubernetes"], obstacles: ["Tedesco C1 richiesto"] },
    seen: true,
    description: "Wir suchen eine Platform Engineer mit Erfahrung in Go und Kubernetes. Sehr gute Deutschkenntnisse erforderlich.",
  },
  {
    id: "demo-8", source: "himalayas", title: "Django Developer", company: "Paperfold",
    location: "Remoto, Europa", workMode: "remote", daysAgo: 9, tags: ["Django", "htmx", "PostgreSQL"], lang: "en", quick: 84,
    ai: { score: 85, chance: "alta", summary: "Django e htmx sono esattamente il tuo lavoro quotidiano.", strengths: ["Django", "htmx", "PostgreSQL"], gaps: [], obstacles: [] },
    status: "applied", seen: true,
    description: "Paperfold makes document workflows for small businesses. We use Django, htmx and PostgreSQL and ship small, often.",
  },
  {
    id: "demo-9", source: "arbeitnow", title: "Full-stack Engineer", company: "Velo Mobility",
    location: "Vienna, Austria", workMode: "hybrid", daysAgo: 14, tags: ["Python", "React"], lang: "en", quick: 77,
    ai: { score: 79, chance: "alta", summary: "Python e React, team internazionale in inglese.", strengths: ["Python", "React"], gaps: ["Esperienza con mappe e geodati"], obstacles: [] },
    status: "applied", seen: true,
    description: "Velo Mobility builds software for bike sharing fleets. Our stack is Python on the backend and React on the frontend.",
  },
  {
    id: "demo-10", source: "remoteok", title: "Web Developer", company: "Sunline Media",
    location: "Remoto, worldwide", workMode: "remote", daysAgo: 18, tags: ["PHP", "WordPress"], lang: "en", quick: 38,
    ai: { score: 31, chance: "bassa", summary: "Il lavoro è su PHP e WordPress, lontano dal tuo stack.", strengths: ["HTML e CSS"], gaps: ["PHP", "WordPress"], obstacles: [] },
    status: "dismissed", seen: true,
    description: "Maintain and extend WordPress sites for our media clients. PHP experience required.",
  },
  {
    id: "demo-11", source: "adzuna", title: "Sviluppatrice Backend Python", company: "Fiordaliso Software",
    location: "Milano", workMode: "hybrid", daysAgo: 20, tags: ["Python", "Django"], lang: "it", quick: 80,
    ai: { score: 78, chance: "alta", summary: "Django e Python in linea, due giorni in ufficio a Milano.", strengths: ["Django", "Python"], gaps: [], obstacles: [] },
    status: "applied", seen: true,
    description: "Cerchiamo una persona per il team backend: Python, Django e PostgreSQL. Ibrido, due giorni a settimana in ufficio a Milano.",
  },
];

function matchFor(j: DemoJob): MatchDetails {
  // stessi dettagli del punteggio vero (titolo vicino, competenze del CV trovate), con il punteggio di esempio
  return { ...quickMatch({ title: j.title, description: j.description, tags: j.tags }, demoProfile), score: j.quick };
}

function tailoredCv(j: DemoJob): TailoredCv {
  const lang = j.lang === "it" ? "it" : "en";
  return {
    language: lang,
    name: demoProfile.name,
    headline: lang === "it" ? "Sviluppatrice web full-stack" : "Full-stack Web Developer",
    email: demoProfile.email,
    phone: "",
    location: demoProfile.location,
    links: demoProfile.links,
    summary:
      lang === "it"
        ? "Sviluppatrice full-stack con 3 anni di esperienza su applicazioni Django e React in produzione."
        : `Full-stack developer with 3 years of experience shipping Django and React applications, a good fit for ${j.company}.`,
    experience: demoProfile.experience.map((e) => ({ ...e })),
    education: demoProfile.education.map((e) => ({ ...e })),
    skills: demoProfile.skills,
    certifications: [],
    languages: demoProfile.languages.map((l) => ({ name: l.name, level: l.level })),
    projects: demoProfile.projects.map((p) => ({ ...p })),
  };
}

function letterFor(j: DemoJob): string {
  return j.lang === "it"
    ? `Gentile team di ${j.company},\n\nvi scrivo per la posizione di ${j.title}. Da tre anni sviluppo applicazioni web aziendali con Django e React e seguo anche il deploy su server Linux.\n\nSarei felice di raccontarvi di più in un colloquio.\n\nCordiali saluti,\n${demoProfile.name}`
    : `Dear ${j.company} team,\n\nI am applying for the ${j.title} role. For the last three years I have been building business web applications with Django and React, and deploying them on Linux servers.\n\nI would be glad to tell you more in an interview.\n\nBest regards,\n${demoProfile.name}`;
}

/** Svuota il database demo e lo riempie con i dati di esempio. Con onlyIfEmpty non fa nulla se c'è già un profilo. */
export async function seedDemo({ onlyIfEmpty = false } = {}): Promise<{ seeded: boolean }> {
  const db = getDemoDb();
  await ensureCvColumns(db);
  if (onlyIfEmpty) {
    const existing = await db.select({ id: profile.id }).from(profile).limit(1);
    if (existing.length) return { seeded: false };
  }

  await db.transaction(async (tx) => {
    await tx.delete(applications);
    await tx.delete(tailored);
    await tx.delete(jobs);
    await tx.delete(companies);
    await tx.delete(profile);
    await tx.delete(settings);

    await tx.insert(profile).values({ id: 1, data: demoProfile, rawText: "" });
    await tx.insert(settings).values({ id: 1, data: defaultSettings() });

    await tx.insert(jobs).values(
      demoJobs.map((j) => ({
        id: j.id,
        source: j.source,
        externalId: j.id,
        dedupeKey: dedupeKey(j.company, j.title),
        title: j.title,
        company: j.company,
        location: j.location,
        workMode: j.workMode,
        description: j.description,
        url: HOME[j.source],
        sourceUrl: HOME[j.source],
        postedAt: ago(j.daysAgo + 0.5),
        salary: j.salary ?? null,
        tags: j.tags,
        adLanguage: j.lang,
        quickScore: j.quick,
        match: matchFor(j),
        aiScore: j.ai?.score ?? null,
        aiEval: j.ai ? { ...j.ai, applicationLanguage: j.lang, keywords: j.tags } : null,
        status: j.status ?? "new",
        seenAt: j.seen ? ago(j.daysAgo) : null,
        createdAt: ago(j.daysAgo),
        lastSeenAt: ago(0),
      })),
    );

    // CV e lettera già pronti per le offerte migliori e per quelle a cui "Giulia" si è candidata.
    const withCv = demoJobs.filter((j) => ["demo-1", "demo-8", "demo-9", "demo-11"].includes(j.id));
    const rows = await tx
      .insert(tailored)
      .values(
        withCv.map((j) => ({
          jobId: j.id,
          language: j.lang === "it" ? "it" : "en",
          cv: tailoredCv(j),
          letter: letterFor(j),
          corrections: [],
          model: "esempio",
          createdAt: ago(j.daysAgo),
        })),
      )
      .returning({ id: tailored.id, jobId: tailored.jobId });
    const cvFor = new Map(rows.map((r) => [r.jobId, r.id]));

    await tx.insert(applications).values([
      { jobId: "demo-8", status: "inviata", appliedAt: ago(8), followUpAt: ago(-2), tailoredId: cvFor.get("demo-8") ?? null, notes: "" },
      {
        jobId: "demo-9", status: "colloquio", appliedAt: ago(13), followUpAt: null, tailoredId: cvFor.get("demo-9") ?? null,
        notes: "Primo colloquio con il team tecnico fissato per giovedì.",
      },
      {
        jobId: "demo-11", status: "rifiutato", appliedAt: ago(19), followUpAt: null, followUpDone: true,
        tailoredId: cvFor.get("demo-11") ?? null, notes: "Hanno scelto un profilo più senior.",
      },
    ]);
  });

  return { seeded: true };
}

import { describe, expect, it } from "vitest";
import { buildTextIndex, cvTitles, searchQueries, titleSimilarity, titleWords } from "@/lib/cv/signals";
import { jobSeniority, quickMatch } from "@/lib/filters/match";
import type { CvIndex } from "@/lib/types";
import { makeProfile } from "./helpers";

/** CV in italiano di una persona che fa project management nel software; annunci in inglese. */
const itIndex: CvIndex = {
  titles: ["IT Project Manager", "Technical Project Manager", "Scrum Master", "Delivery Manager", "Project Manager IT"],
  skills: [
    { name: "Gestione progetti", aliases: ["project management", "PM"], weight: 3 },
    { name: "Metodologie Agile", aliases: ["agile", "scrum", "kanban"], weight: 3 },
    { name: "Jira", aliases: [], weight: 2 },
    { name: "Gestione stakeholder", aliases: ["stakeholder management"], weight: 2 },
    { name: "Budget di progetto", aliases: ["budgeting", "budget management"], weight: 2 },
    { name: "PMP", aliases: ["Project Management Professional"], weight: 1 },
  ],
  domains: ["fintech", "SaaS"],
  keywords: ["roadmap", "risk management", "release planning", "cross-functional teams"],
  source: "ai",
  builtAt: "2026-11-19T00:00:00.000Z",
};

const itProfile = makeProfile({
  headline: "Project Manager",
  skills: ["Gestione progetti", "Jira", "Confluence"],
  experience: [
    { company: "Banca Alfa S.p.A.", role: "Responsabile di progetto IT", location: "Milano", start: "03/2020", end: "", bullets: [] },
    { company: "Software Beta Srl", role: "Analista funzionale", location: "Torino", start: "01/2016", end: "02/2020", bullets: [] },
  ],
  // preferenze rimaste da un vecchio profilo: non devono nascondere il CV
  preferences: {
    targetRoles: ["Business Analyst"],
    excludeKeywords: [],
    workModes: ["remote", "hybrid", "onsite"],
    willingToRelocate: true,
    yearsExperience: 9,
    seniority: "senior",
  },
  cvIndex: itIndex,
});

const ad = (title: string, description: string) => ({ title, description, tags: [] });

describe("titoli: sinonimi e traduzioni", () => {
  it("sviluppatore = developer = engineer", () => {
    expect(titleWords("Sviluppatore Software")).toEqual(expect.arrayContaining(["engineer", "software"]));
    expect(titleSimilarity("Software Engineer", "Sviluppatore software")).toBeGreaterThan(0.9);
    expect(titleSimilarity("Senior Backend Developer (Remote, EU)", "Back-end Engineer")).toBeGreaterThan(0.9);
  });
  it("la seniority e la località nel titolo non contano", () => {
    expect(titleWords("Senior Data Analyst - Remote EMEA")).toEqual(["data", "analyst"]);
  });
  it("mestieri diversi restano diversi", () => {
    expect(titleSimilarity("Registered Nurse", "Data Analyst")).toBe(0);
    expect(titleSimilarity("Sales Manager", "Project Manager")).toBeLessThan(0.6);
  });
});

describe("seniority", () => {
  it("'Manager' da solo non è un ruolo da lead", () => {
    expect(jobSeniority("Project Manager")).toBeNull();
    expect(jobSeniority("Marketing Manager")).toBeNull();
    expect(jobSeniority("Senior Engineering Manager")?.label).toBe("lead");
    expect(jobSeniority("Head of Product")?.label).toBe("direttivo");
  });
});

describe("il CV conta più delle preferenze", () => {
  it("i titoli del CV vengono prima dei ruoli scritti a mano", () => {
    const titles = cvTitles(itProfile).map((t) => t.title);
    expect(titles[0]).toBe("IT Project Manager");
    expect(titles).toContain("Business Analyst");
    expect(titles).toContain("Responsabile di progetto IT");
  });
  it("le query di ricerca alternano CV e ruoli scritti a mano", () => {
    const q = searchQueries(itProfile);
    expect(q[0]).toBe("IT Project Manager");
    expect(q[1]).toBe("Business Analyst");
    expect(q.length).toBeLessThanOrEqual(6);
  });
  it("senza indice usa l'ultimo ruolo e il titolo professionale", () => {
    const q = searchQueries(makeProfile({ preferences: { ...makeProfile().preferences, targetRoles: [] } }));
    expect(q).toEqual(["Data Analyst"]);
  });
});

describe("punteggio rapido sul CV", () => {
  const good = ad(
    "Senior Technical Project Manager",
    "Fintech scale-up looking for a project manager with strong project management skills to run agile delivery with cross-functional teams. " +
      "You own the roadmap, stakeholder management and budgeting. Jira and Confluence daily. 6+ years of experience. PMP is a plus.",
  );

  it("un annuncio in inglese adatto a un CV in italiano ha un punteggio alto", () => {
    const m = quickMatch(good, itProfile);
    expect(m.score).toBeGreaterThanOrEqual(80);
    expect(m.titleMatch).toBe("Technical Project Manager");
    expect(m.skillsFound).toEqual(expect.arrayContaining(["Gestione progetti", "Metodologie Agile", "Jira", "Gestione stakeholder"]));
    expect(m.keywordsFound).toEqual(expect.arrayContaining(["fintech", "roadmap"]));
  });

  it("senza indice del CV lo stesso annuncio passava a malapena", () => {
    const { cvIndex: _drop, ...rest } = itProfile;
    const old = quickMatch(good, { ...rest, preferences: { ...rest.preferences } });
    expect(old.score).toBeLessThan(quickMatch(good, itProfile).score - 20);
  });

  it("un altro mestiere resta basso anche con parole in comune", () => {
    const m = quickMatch(ad("Registered Nurse", "Hospital ward, patient care, agile shifts."), itProfile);
    expect(m.score).toBeLessThan(35);
  });
});

describe("indice dal testo (senza AI)", () => {
  it("prende le parole che il CV ripete e i titoli delle esperienze", () => {
    const text =
      "Project manager con esperienza in Scrum e Jira. Ho guidato progetti Scrum per clienti fintech. " +
      "Uso Jira ogni giorno, release planning e release planning trimestrale. Fintech e pagamenti.";
    const idx = buildTextIndex(text, itProfile);
    expect(idx.source).toBe("text");
    expect(idx.keywords).toContain("release planning");
    expect(idx.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["scrum", "Jira", "fintech"]));
    expect(idx.titles).toContain("Responsabile di progetto IT");
  });
});

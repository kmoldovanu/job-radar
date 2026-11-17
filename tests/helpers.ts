import type { Job, Profile } from "@/lib/types";
import { profileSchema } from "@/lib/types";

export function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: "test:1",
    source: "himalayas",
    externalId: "1",
    title: "Data Analyst",
    company: "Acme",
    location: "Remote",
    locationRestrictions: [],
    timezoneRestrictions: [],
    workMode: "remote",
    description: "We are looking for a data analyst with SQL and Python experience to join our team.",
    url: "https://example.com/job/1",
    sourceUrl: "https://example.com/job/1",
    postedAt: new Date(),
    salary: null,
    tags: [],
    visaSponsorship: null,
    ...over,
  };
}

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return profileSchema.parse({
    name: "Mario Rossi",
    headline: "Data Analyst",
    email: "mario@example.com",
    phone: "+39 333 1234567",
    location: "Milano",
    links: ["https://linkedin.com/in/mariorossi"],
    summary: "Data analyst con 4 anni di esperienza in SQL e Python.",
    experience: [
      {
        company: "Banca Alfa S.p.A.",
        role: "Data Analyst",
        location: "Milano",
        start: "03/2021",
        end: "",
        bullets: [
          "Creato dashboard Power BI usate da 120 persone",
          "Ridotto i tempi di reporting del 30%",
          "Automatizzato estrazioni SQL con Python",
        ],
      },
      {
        company: "Retail Beta Srl",
        role: "Junior Analyst",
        location: "Torino",
        start: "01/2019",
        end: "02/2021",
        bullets: ["Analisi vendite settimanali in Excel"],
      },
    ],
    education: [{ institution: "Politecnico di Milano", degree: "Laurea in Ingegneria Gestionale", start: "2014", end: "2018" }],
    skills: ["SQL", "Python", "Power BI", "Excel", "Tableau"],
    certifications: ["Google Data Analytics Certificate"],
    languages: [
      { name: "Italiano", code: "it", level: "native" },
      { name: "Inglese", code: "en", level: "C1" },
      { name: "Spagnolo", code: "es", level: "B1" },
    ],
    preferences: {
      targetRoles: ["Data Analyst", "Business Intelligence Analyst"],
      excludeKeywords: ["sales"],
      workModes: ["remote", "hybrid", "onsite"],
      willingToRelocate: true,
      yearsExperience: 5,
      seniority: "mid",
    },
    ...over,
  });
}

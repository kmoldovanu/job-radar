import { describe, expect, it } from "vitest";
import { extractNumbers, guardLetter, guardTailoredCv } from "@/lib/ai/guard";
import type { TailoredCv } from "@/lib/types";
import { makeProfile } from "./helpers";

const master = makeProfile();

function baseCv(over: Partial<TailoredCv> = {}): TailoredCv {
  return {
    language: "en",
    name: "Mario Rossi",
    headline: "Data Analyst",
    email: "mario@example.com",
    phone: "+39 333 1234567",
    location: "Milan",
    links: ["https://linkedin.com/in/mariorossi"],
    summary: "Data analyst with 4 years of experience in SQL and Python.",
    experience: [
      {
        company: "Banca Alfa",
        role: "Data Analyst",
        location: "Milan",
        start: "03/2021",
        end: "",
        bullets: ["Built Power BI dashboards used by 120 people", "Cut reporting time by 30%"],
      },
    ],
    education: [{ institution: "Politecnico di Milano", degree: "MSc Management Engineering", start: "2014", end: "2018", details: "" }],
    skills: ["SQL", "Python", "Power BI"],
    certifications: ["Google Data Analytics Certificate"],
    languages: [
      { name: "Italian", level: "native" },
      { name: "English", level: "C1" },
    ],
    projects: [],
    ...over,
  };
}

describe("extractNumbers", () => {
  it("normalizza separatori", () => {
    expect(extractNumbers("1.200 utenti, 1,200 users, 3,5 punti, 30%")).toEqual(["1200", "1200", "3.5", "30"]);
  });
});

describe("guardTailoredCv", () => {
  it("CV fedele: nessuna correzione", () => {
    const { corrections } = guardTailoredCv(baseCv(), master);
    expect(corrections).toEqual([]);
  });

  it("toglie aziende inventate", () => {
    const cv = baseCv();
    cv.experience.push({ company: "Google", role: "Analyst", location: "", start: "2020", end: "2021", bullets: [] });
    const r = guardTailoredCv(cv, master);
    expect(r.cv.experience.map((e) => e.company)).toEqual(["Banca Alfa S.p.A."]);
    expect(r.corrections.join("\n")).toContain("Google");
  });

  it("forza le date del master", () => {
    const cv = baseCv();
    cv.experience[0].start = "01/2019";
    const r = guardTailoredCv(cv, master);
    expect(r.cv.experience[0].start).toBe("03/2021");
    expect(r.corrections.join("\n")).toContain("Date");
  });

  it("toglie competenze e certificazioni che non ho", () => {
    const r = guardTailoredCv(baseCv({ skills: ["SQL", "Kubernetes", "python"], certifications: ["AWS Certified Solutions Architect"] }), master);
    expect(r.cv.skills).toEqual(["SQL", "python"]);
    expect(r.cv.certifications).toEqual([]);
    expect(r.corrections.join("\n")).toContain("Kubernetes");
    expect(r.corrections.join("\n")).toContain("AWS");
  });

  it("toglie i punti con metriche inventate", () => {
    const cv = baseCv();
    cv.experience[0].bullets = [
      "Built Power BI dashboards used by 120 people",
      "Increased revenue by 45%",
      "Managed a budget of 2M euros",
      "Automated SQL extractions with Python",
    ];
    const r = guardTailoredCv(cv, master);
    expect(r.cv.experience[0].bullets).toEqual(["Built Power BI dashboards used by 120 people", "Automated SQL extractions with Python"]);
    expect(r.corrections.filter((c) => c.includes("Rimosso punto"))).toHaveLength(2);
  });

  it("ripristina i dati di contatto e toglie link inventati", () => {
    const r = guardTailoredCv(baseCv({ email: "altro@x.com", links: ["https://github.com/fake"] }), master);
    expect(r.cv.email).toBe("mario@example.com");
    expect(r.cv.links).toEqual([]);
  });

  it("toglie lingue non presenti e frasi del sommario con numeri inventati", () => {
    const r = guardTailoredCv(
      baseCv({
        languages: [{ name: "German", level: "C1" }, { name: "English", level: "C2" }],
        summary: "Data analyst with SQL skills. Led a team of 15 analysts.",
      }),
      master,
    );
    expect(r.cv.languages).toEqual([{ name: "English", level: "C1" }]);
    expect(r.cv.summary).toBe("Data analyst with SQL skills.");
  });
});

describe("guardLetter", () => {
  it("ammette numeri del master e dell'annuncio, toglie gli altri", () => {
    const letter = "I reduced reporting time by 30%. I saved the company 500k euros.\nYour team of 40 people inspires me.";
    const r = guardLetter(letter, master, "Join our team of 40 people");
    expect(r.letter).toContain("30%");
    expect(r.letter).toContain("40 people");
    expect(r.letter).not.toContain("500k");
    expect(r.corrections).toHaveLength(1);
  });
});

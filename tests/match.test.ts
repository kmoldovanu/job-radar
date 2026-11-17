import { describe, expect, it } from "vitest";
import { excludedInTitle, jobSeniority, quickMatch, yearsRequired } from "@/lib/filters/match";
import { makeProfile } from "./helpers";

const profile = makeProfile();
const job = (title: string, description = "", tags: string[] = []) => ({ title, description, tags });

describe("seniority e anni", () => {
  it("riconosce la seniority dal titolo", () => {
    expect(jobSeniority("Senior Data Analyst")?.label).toBe("senior");
    expect(jobSeniority("Junior Analyst")?.label).toBe("junior");
    expect(jobSeniority("Head of Data")?.label).toBe("direttivo");
    expect(jobSeniority("Data Analyst")).toBeNull();
  });
  it("estrae gli anni richiesti", () => {
    expect(yearsRequired("You have 3+ years of experience with SQL")).toBe(3);
    expect(yearsRequired("5-7 years of professional experience")).toBe(5);
    expect(yearsRequired("almeno 2 anni di esperienza")).toBe(2);
    expect(yearsRequired("Mindestens 4 Jahre Berufserfahrung")).toBe(4);
    expect(yearsRequired("No experience needed")).toBeNull();
  });
});

describe("quickMatch", () => {
  it("offerta perfetta → punteggio alto", () => {
    const m = quickMatch(job("Data Analyst", "SQL, Python, Power BI and Tableau. 3+ years of experience."), profile);
    expect(m.score).toBeGreaterThanOrEqual(80);
    expect(m.skillsFound).toEqual(expect.arrayContaining(["SQL", "Python", "Power BI", "Tableau"]));
  });
  it("ruolo diverso → punteggio basso", () => {
    const m = quickMatch(job("Registered Nurse", "Patient care in hospital wards."), profile);
    expect(m.score).toBeLessThan(30);
  });
  it("troppo senior penalizza", () => {
    const base = quickMatch(job("Data Analyst", "SQL Python"), profile).score;
    const director = quickMatch(job("Director of Data Analyst Team", "SQL Python. 12+ years of experience"), profile);
    expect(director.score).toBeLessThan(base);
    expect(director.notes.join(" ")).toMatch(/troppo senior|anni/);
  });
  it("troppo junior penalizza un profilo senior", () => {
    const senior = makeProfile({ preferences: { ...profile.preferences, seniority: "lead" } });
    const m = quickMatch(job("Data Analyst Intern", "SQL"), senior);
    expect(m.notes.join(" ")).toContain("troppo junior");
  });
  it("parole da escludere", () => {
    expect(excludedInTitle("Sales Data Analyst", ["sales"])).toBe("sales");
    expect(excludedInTitle("Data Analyst", ["sales"])).toBeNull();
    const m = quickMatch(job("Data Analyst", "Support our sales team with SQL"), profile);
    expect(m.notes.join(" ")).toContain("sales");
  });
});

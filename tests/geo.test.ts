import { describe, expect, it } from "vitest";
import { checkGeo, classifyPlace, visaStatus } from "@/lib/filters/geo";
import { makeJob, makeProfile } from "./helpers";

const prefs = makeProfile().preferences;

describe("classifyPlace", () => {
  it.each([
    ["Berlin, Germany", "eligible"],
    ["Milano, Italia", "eligible"],
    ["Zürich", "eligible"],
    ["Oslo, Norway", "eligible"],
    ["Milan, IT", "eligible"],
    ["Berlin, DE", "eligible"],
    ["Worldwide", "region_ok"],
    ["EMEA", "region_ok"],
    ["Europe", "region_ok"],
    ["Austin, TX", "ineligible"],
    ["Dublin, OH", "ineligible"],
    ["New York, NY", "ineligible"],
    ["United States", "ineligible"],
    ["USA only", "ineligible"],
    ["London, UK", "ineligible"],
    ["California", "ineligible"],
    ["LATAM", "ineligible"],
    ["Toronto, Canada", "ineligible"],
    ["Remote", "unknown"],
    ["", "unknown"],
  ])("%s → %s", (place, cls) => {
    expect(classifyPlace(place).cls).toBe(cls);
  });
});

describe("checkGeo: remoto", () => {
  it("tiene worldwide / Europa / Italia", () => {
    expect(checkGeo(makeJob({ locationRestrictions: ["Worldwide"] }), prefs).ok).toBe(true);
    expect(checkGeo(makeJob({ locationRestrictions: ["Europe"] }), prefs).ok).toBe(true);
    expect(checkGeo(makeJob({ locationRestrictions: ["United States", "Italy"] }), prefs).ok).toBe(true);
    expect(checkGeo(makeJob({ location: "Remote" }), prefs).ok).toBe(true);
  });
  it("scarta remoto solo USA", () => {
    const r = checkGeo(makeJob({ locationRestrictions: ["United States"], location: "United States" }), prefs);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("geografia");
  });
  it("scarta le frasi restrittive nel testo", () => {
    for (const d of [
      "Candidates must be located in the US.",
      "You must be authorized to work in the United States.",
      "Active security clearance required.",
      "This is a US-only remote position.",
      "Remote within the US, any state.",
    ]) {
      expect(checkGeo(makeJob({ locationRestrictions: ["Worldwide"], description: d }), prefs).ok, d).toBe(false);
    }
  });
  it("scarta fusi orari solo americani", () => {
    expect(checkGeo(makeJob({ timezoneRestrictions: [-5, -8] }), prefs).ok).toBe(false);
    expect(checkGeo(makeJob({ timezoneRestrictions: [-1, 1, 2] }), prefs).ok).toBe(true);
  });
});

describe("checkGeo: in sede", () => {
  it("tiene le sedi UE/SEE/CH", () => {
    expect(checkGeo(makeJob({ workMode: "onsite", location: "Amsterdam, Netherlands" }), prefs).ok).toBe(true);
    expect(checkGeo(makeJob({ workMode: "hybrid", location: "Geneva, Switzerland" }), prefs).ok).toBe(true);
  });
  it("fuori UE senza sponsor → scarta", () => {
    const r = checkGeo(makeJob({ workMode: "onsite", location: "London, UK" }), prefs);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("sponsor");
  });
  it("fuori UE con sponsor del visto → tiene", () => {
    const job = makeJob({ workMode: "onsite", location: "Toronto, Canada", description: "We offer visa sponsorship and relocation support." });
    expect(checkGeo(job, prefs).ok).toBe(true);
  });
  it("'no sponsorship' vince su tutto", () => {
    const job = makeJob({
      workMode: "onsite",
      location: "Sydney, Australia",
      visaSponsorship: true,
      description: "Unfortunately we are unable to provide visa sponsorship.",
    });
    expect(visaStatus(job)).toBe("no");
    expect(checkGeo(job, prefs).ok).toBe(false);
  });
  it("rispetta la disponibilità a trasferirsi", () => {
    const noMove = { ...prefs, willingToRelocate: false };
    expect(checkGeo(makeJob({ workMode: "onsite", location: "Paris, France" }), noMove).ok).toBe(false);
    expect(checkGeo(makeJob({ workMode: "onsite", location: "Milano" }), noMove).ok).toBe(true);
    expect(checkGeo(makeJob({ workMode: "remote", location: "Europe" }), noMove).ok).toBe(true);
  });
  it("rispetta le modalità preferite", () => {
    const onlyRemote = { ...prefs, workModes: ["remote" as const] };
    const r = checkGeo(makeJob({ workMode: "onsite", location: "Berlin" }), onlyRemote);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("modalita");
  });
});

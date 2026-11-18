import { describe, expect, it } from "vitest";
import { createDemoToken, createSessionToken, DEMO_PREFIX, sessionKind, verifySessionToken } from "@/lib/auth";
import { demoCanRequest } from "@/lib/demo";

const SECRET = "x".repeat(32);

describe("sessione demo", () => {
  it("distingue proprietario e ospite", async () => {
    expect(await sessionKind(await createSessionToken(SECRET), SECRET)).toBe("owner");
    expect(await sessionKind(await createDemoToken(SECRET), SECRET)).toBe("demo");
    expect(await sessionKind(undefined, SECRET)).toBeNull();
  });

  it("un token demo non vale come accesso del proprietario", async () => {
    expect(await verifySessionToken(await createDemoToken(SECRET), SECRET)).toBe(false);
  });

  it("non si può trasformare un token del proprietario in demo o viceversa", async () => {
    const owner = await createSessionToken(SECRET);
    expect(await sessionKind(DEMO_PREFIX + owner, SECRET)).toBeNull();
    const demo = await createDemoToken(SECRET);
    expect(await sessionKind(demo.slice(DEMO_PREFIX.length), SECRET)).toBeNull();
  });

  it("scade dopo un giorno", async () => {
    const t = await createDemoToken(SECRET, 0);
    expect(await sessionKind(t, SECRET, 2 * 86_400_000)).toBeNull();
  });
});

describe("permessi della demo", () => {
  it("lascia leggere tutto", () => {
    expect(demoCanRequest("GET", "/api/jobs")).toBe(true);
    expect(demoCanRequest("GET", "/api/jobs/demo-1/download")).toBe(true);
  });

  it("lascia le azioni che toccano solo i dati di esempio", () => {
    expect(demoCanRequest("POST", "/api/jobs/demo-1/seen")).toBe(true);
    expect(demoCanRequest("POST", "/api/jobs/demo-1/dismiss")).toBe(true);
    expect(demoCanRequest("POST", "/api/jobs/demo-1/apply")).toBe(true);
    expect(demoCanRequest("PATCH", "/api/applications/3")).toBe(true);
    expect(demoCanRequest("POST", "/api/auth/logout")).toBe(true);
  });

  it("blocca ricerca, AI, profilo, impostazioni e pagine carriere", () => {
    expect(demoCanRequest("POST", "/api/search/run")).toBe(false);
    expect(demoCanRequest("GET", "/api/search/tasks")).toBe(false);
    expect(demoCanRequest("POST", "/api/jobs/demo-1/evaluate")).toBe(false);
    expect(demoCanRequest("POST", "/api/jobs/demo-1/tailor")).toBe(false);
    expect(demoCanRequest("POST", "/api/jobs/manual")).toBe(false);
    expect(demoCanRequest("PUT", "/api/profile")).toBe(false);
    expect(demoCanRequest("POST", "/api/profile/upload")).toBe(false);
    expect(demoCanRequest("PUT", "/api/settings")).toBe(false);
    expect(demoCanRequest("POST", "/api/companies")).toBe(false);
    expect(demoCanRequest("DELETE", "/api/companies/1")).toBe(false);
  });
});

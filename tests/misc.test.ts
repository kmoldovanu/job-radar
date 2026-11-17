import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { isFresh } from "@/lib/filters/freshness";
import { runFilters } from "@/lib/filters/pipeline";
import { checkScam } from "@/lib/filters/scam";
import { runQueue } from "@/lib/queue";
import { defaultSettings } from "@/lib/types";
import { makeJob, makeProfile } from "./helpers";

describe("anti-truffa", () => {
  it("scarta annunci senza azienda o sospetti", () => {
    expect(checkScam(makeJob({ company: "" })).ok).toBe(false);
    expect(checkScam(makeJob({ description: "Contact us on Telegram @hr" })).ok).toBe(false);
    expect(checkScam(makeJob({ description: "Write to us on WhatsApp" })).ok).toBe(false);
    expect(checkScam(makeJob({ description: "This is a commission-only role" })).ok).toBe(false);
    expect(checkScam(makeJob({ description: "You need to pay a registration fee of 50 euros" })).ok).toBe(false);
    expect(checkScam(makeJob({ description: "Join our MLM network marketing team" })).ok).toBe(false);
    expect(checkScam(makeJob()).ok).toBe(true);
  });
});

describe("freschezza", () => {
  it("rispetta la soglia in giorni", () => {
    const now = new Date("2026-01-30T00:00:00Z");
    expect(isFresh(new Date("2026-01-20T00:00:00Z"), 21, now)).toBe(true);
    expect(isFresh(new Date("2025-12-01T00:00:00Z"), 21, now)).toBe(false);
    expect(isFresh(null, 21, now)).toBe(true);
  });
});

describe("pipeline", () => {
  it("conta gli scarti per motivo", () => {
    const now = new Date();
    const profile = makeProfile();
    const jobs = [
      makeJob({ id: "a", description: "SQL Python Power BI dashboards for our team. 3 years of experience." }),
      makeJob({ id: "b", postedAt: new Date(now.getTime() - 60 * 86400000) }),
      makeJob({ id: "c", company: "" }),
      makeJob({ id: "d", locationRestrictions: ["United States"] }),
      makeJob({ id: "e", title: "Registered Nurse", description: "Patient care" }),
      makeJob({ id: "f", title: "Sales Data Analyst" }),
      makeJob({ id: "a" }),
    ];
    const out = runFilters(jobs, profile, defaultSettings(), now);
    expect(out.kept.map((j) => j.id)).toEqual(["a"]);
    expect(out.rejected).toEqual({ vecchio: 1, truffa: 1, geografia: 1, match_basso: 1, parola_esclusa: 1, duplicato: 1 });
    expect(out.samples.length).toBe(6);
  });
});

describe("coda client", () => {
  it("rispetta la concorrenza e continua se un elemento fallisce", async () => {
    let active = 0;
    let peak = 0;
    const progress: number[] = [];
    const res = await runQueue(
      [1, 2, 3, 4, 5, 6, 7],
      3,
      async (n) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
        if (n === 4) throw new Error("boom");
        return n * 2;
      },
      (done) => progress.push(done),
    );
    expect(peak).toBe(3);
    expect(progress).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(res.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(res[0]).toEqual({ status: "fulfilled", value: 2 });
  });
});

describe("sessione", () => {
  it("firma e verifica il cookie", async () => {
    const t = await createSessionToken("segreto-di-prova-lungo");
    expect(await verifySessionToken(t, "segreto-di-prova-lungo")).toBe(true);
    expect(await verifySessionToken(t, "altro-segreto-lungo!!")).toBe(false);
    expect(await verifySessionToken(t.replace(/.$/, "x"), "segreto-di-prova-lungo")).toBe(false);
    const expired = await createSessionToken("segreto-di-prova-lungo", Date.now() - 40 * 86400000);
    expect(await verifySessionToken(expired, "segreto-di-prova-lungo")).toBe(false);
  });
});

describe("CSV", () => {
  it("fa l'escape di virgole e virgolette", () => {
    expect(toCsv([["a", 'b "c"', "d,e"], [1, null, "x"]])).toBe('a,"b ""c""","d,e"\r\n1,,x');
  });
});

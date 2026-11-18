import type { Job, Preferences } from "../types";
import { fetchJson, guessWorkMode, htmlToText, jobId, str, toDate } from "./util";

/**
 * The Muse: API pubblica GET https://www.themuse.com/api/public/jobs
 * (parametri ripetibili location / level, chiave facoltativa per limiti più alti).
 * Non ha ricerca per parole chiave: filtriamo per località e livello, poi ci pensa il match rapido.
 */
export const MUSE_LOCATIONS = [
  "Flexible / Remote",
  "Berlin, Germany", "Munich, Germany", "Hamburg, Germany", "Amsterdam, Netherlands", "Dublin, Ireland",
  "Paris, France", "Madrid, Spain", "Barcelona, Spain", "Milan, Italy", "Rome, Italy", "Lisbon, Portugal",
  "Zurich, Switzerland", "Vienna, Austria", "Brussels, Belgium", "Stockholm, Sweden", "Copenhagen, Denmark",
  "Warsaw, Poland", "Prague, Czech Republic",
];

const LEVELS: Record<Preferences["seniority"], string[]> = {
  junior: ["Entry Level", "Mid Level"],
  mid: ["Mid Level", "Senior Level"],
  senior: ["Senior Level", "Mid Level"],
  lead: ["Senior Level", "management"],
};

export function parse(data: unknown): Job[] {
  const results = (data as { results?: unknown[] })?.results;
  if (!Array.isArray(results)) return [];
  const out: Job[] = [];
  for (const raw of results) {
    const j = raw as Record<string, unknown>;
    const title = str(j.name);
    const url = str((j.refs as Record<string, unknown>)?.landing_page);
    if (!title || !url) continue;
    const locations = Array.isArray(j.locations)
      ? (j.locations as Record<string, unknown>[]).map((l) => str(l?.name)).filter(Boolean)
      : [];
    // "Flexible / Remote" non dice da dove: lo togliamo dalle restrizioni, il filtro geografico userà le altre sedi
    const places = locations.filter((l) => !/flexible|remote/i.test(l));
    const remote = locations.some((l) => /flexible|remote/i.test(l));
    const description = htmlToText(str(j.contents));
    const company = str((j.company as Record<string, unknown>)?.name);
    out.push({
      id: jobId("themuse", str(j.id) || url),
      source: "themuse",
      externalId: str(j.id) || url,
      title,
      company,
      location: locations.join(" · "),
      locationRestrictions: places,
      timezoneRestrictions: [],
      workMode: remote ? "remote" : guessWorkMode(title, locations.join(" ")),
      description,
      url,
      sourceUrl: url,
      postedAt: toDate(j.publication_date),
      salary: null,
      tags: [
        ...(Array.isArray(j.categories) ? (j.categories as Record<string, unknown>[]).map((c) => str(c?.name)) : []),
        ...(Array.isArray(j.levels) ? (j.levels as Record<string, unknown>[]).map((l) => str(l?.name)) : []),
      ].filter(Boolean),
      visaSponsorship: null,
    });
  }
  return out;
}

export function buildUrl(page: number, seniority: Preferences["seniority"], apiKey?: string): string {
  const p = new URLSearchParams({ page: String(page), descending: "true" });
  for (const l of MUSE_LOCATIONS) p.append("location", l);
  for (const l of LEVELS[seniority]) p.append("level", l);
  if (apiKey) p.set("api_key", apiKey);
  return `https://www.themuse.com/api/public/jobs?${p}`;
}

export async function fetchJobs(seniority: Preferences["seniority"]): Promise<Job[]> {
  const key = process.env.THEMUSE_API_KEY || undefined;
  const results = await Promise.allSettled([0, 1, 2].map((page) => fetchJson(buildUrl(page, seniority, key))));
  const ok = results.filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  return ok.flatMap((r) => parse(r.value));
}

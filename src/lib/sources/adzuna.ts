import type { Job } from "../types";
import { fetchJson, guessWorkMode, htmlToText, jobId, str, toDate, formatSalary } from "./util";

const CURRENCY: Record<string, string> = {
  gb: "GBP", us: "USD", ca: "CAD", au: "AUD", nz: "NZD", sg: "SGD", in: "INR", mx: "MXN",
  br: "BRL", za: "ZAR", ch: "CHF", pl: "PLN",
};

export const COUNTRY_NAMES: Record<string, string> = {
  gb: "United Kingdom", us: "United States", de: "Germany", fr: "France", it: "Italy",
  nl: "Netherlands", es: "Spain", at: "Austria", be: "Belgium", ch: "Switzerland",
  pl: "Poland", ca: "Canada", au: "Australia", nz: "New Zealand", sg: "Singapore",
  in: "India", mx: "Mexico", br: "Brazil", za: "South Africa",
};

export function parse(data: unknown, country: string): Job[] {
  const results = (data as { results?: unknown[] })?.results;
  if (!Array.isArray(results)) return [];
  const out: Job[] = [];
  for (const raw of results) {
    const j = raw as Record<string, unknown>;
    const title = htmlToText(str(j.title));
    const url = str(j.redirect_url);
    if (!title || !url) continue;
    const loc = (j.location as Record<string, unknown>) ?? {};
    const area = Array.isArray(loc.area) ? (loc.area as string[]) : [];
    const display = str(loc.display_name);
    const countryName = COUNTRY_NAMES[country] ?? country.toUpperCase();
    const location = [display, display.includes(countryName) ? "" : countryName].filter(Boolean).join(", ");
    const description = htmlToText(str(j.description));
    out.push({
      id: jobId("adzuna", str(j.id) || url),
      source: "adzuna",
      externalId: str(j.id) || url,
      title,
      company: str((j.company as Record<string, unknown>)?.display_name),
      location,
      locationRestrictions: area.length ? [area[0]] : [countryName],
      timezoneRestrictions: [],
      workMode: guessWorkMode(title, description, location),
      description,
      url,
      sourceUrl: url,
      postedAt: toDate(j.created),
      salary: formatSalary(j.salary_min, j.salary_max, CURRENCY[country] ?? "EUR"),
      tags: [str((j.category as Record<string, unknown>)?.label), str(j.contract_type), str(j.contract_time)].filter(Boolean),
      visaSponsorship: null,
    });
  }
  return out;
}

export async function fetchJobs(country: string, queries: string[], maxAgeDays: number): Promise<Job[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY non impostate");
  const qs = queries.length ? queries.slice(0, 3) : [""];
  const results = await Promise.allSettled(
    qs.map((q) => {
      const p = new URLSearchParams({
        app_id: id,
        app_key: key,
        results_per_page: "50",
        max_days_old: String(maxAgeDays),
        sort_by: "date",
      });
      if (q) p.set("what", q);
      return fetchJson(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${p}`);
    }),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  return ok.flatMap((r) => parse(r.value, country));
}

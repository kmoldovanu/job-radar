import type { Job } from "../types";
import { fetchJson, htmlToText, jobId, str, strArray, toDate, formatSalary } from "./util";

/** Remote OK: il primo elemento dell'array è l'avviso legale, va saltato. */
export function parse(data: unknown): Job[] {
  if (!Array.isArray(data)) return [];
  const out: Job[] = [];
  for (const raw of data) {
    const j = raw as Record<string, unknown>;
    if (!j || typeof j !== "object" || "legal" in j || !j.id) continue;
    const title = str(j.position);
    const sourceUrl = str(j.url) || `https://remoteok.com/remote-jobs/${str(j.id)}`;
    // Link diretto alla candidatura sul sito dell'azienda (le offerte nuove su Remote OK
    // possono essere riservate agli abbonati Premium). L'attribuzione "via Remote OK"
    // continua a puntare all'annuncio su Remote OK, come chiedono le loro condizioni.
    const applyUrl = str(j.apply_url);
    if (!title) continue;
    const location = str(j.location);
    out.push({
      id: jobId("remoteok", str(j.id)),
      source: "remoteok",
      externalId: str(j.id),
      title,
      company: str(j.company),
      location: location || "Remote",
      locationRestrictions: location ? location.split(/[,;/]| or /).map((s) => s.trim()).filter(Boolean) : [],
      timezoneRestrictions: [],
      workMode: "remote",
      description: htmlToText(str(j.description)),
      url: /^https?:\/\//.test(applyUrl) ? applyUrl : sourceUrl,
      sourceUrl,
      postedAt: toDate(j.epoch) ?? toDate(j.date),
      salary: formatSalary(j.salary_min, j.salary_max, "USD"),
      tags: strArray(j.tags),
      visaSponsorship: null,
    });
  }
  return out;
}

export async function fetchJobs(): Promise<Job[]> {
  return parse(await fetchJson("https://remoteok.com/api"));
}

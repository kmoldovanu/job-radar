import type { Job } from "../types";
import { fetchJson, htmlToText, jobId, str, strArray, toDate, formatSalary } from "./util";

/** Himalayas: solo lavori remoti. pubDate è in secondi. */
export function parse(data: unknown): Job[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const raw of jobs) {
    const j = raw as Record<string, unknown>;
    const title = str(j.title);
    const link = str(j.applicationLink) || str(j.guid);
    if (!title || !link) continue;
    const externalId = str(j.guid) || link;
    const restrictions = strArray(j.locationRestrictions);
    out.push({
      id: jobId("himalayas", externalId),
      source: "himalayas",
      externalId,
      title,
      company: str(j.companyName),
      location: restrictions.length ? restrictions.join(", ") : "Remote",
      locationRestrictions: restrictions,
      timezoneRestrictions: Array.isArray(j.timezoneRestrictions)
        ? (j.timezoneRestrictions as unknown[]).map(Number).filter((n) => Number.isFinite(n))
        : [],
      workMode: "remote",
      description: htmlToText(str(j.description) || str(j.excerpt)),
      url: link,
      sourceUrl: str(j.guid) || link,
      postedAt: toDate(j.pubDate),
      salary: formatSalary(j.minSalary, j.maxSalary, j.currency),
      tags: [...strArray(j.categories), ...strArray(j.seniority)],
      visaSponsorship: null,
    });
  }
  return out;
}

export async function fetchJobs(queries: string[]): Promise<Job[]> {
  const qs = queries.length ? queries.slice(0, 4) : [""];
  const results = await Promise.allSettled(
    qs.map((q) => fetchJson(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&page=1`)),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  return ok.flatMap((r) => parse(r.value));
}

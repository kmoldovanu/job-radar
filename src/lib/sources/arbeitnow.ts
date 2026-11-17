import type { Job } from "../types";
import { fetchJson, htmlToText, jobId, str, strArray, toDate } from "./util";

/** Arbeitnow: annunci europei (soprattutto Germania), con campo visa_sponsorship. */
export function parse(data: unknown): Job[] {
  const jobs = (data as { data?: unknown[] })?.data;
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const raw of jobs) {
    const j = raw as Record<string, unknown>;
    const title = str(j.title);
    const url = str(j.url);
    if (!title || !url) continue;
    const location = str(j.location);
    const remote = j.remote === true;
    const visa = j.visa_sponsorship;
    out.push({
      id: jobId("arbeitnow", str(j.slug) || url),
      source: "arbeitnow",
      externalId: str(j.slug) || url,
      title,
      company: str(j.company_name),
      location: location || (remote ? "Remote" : ""),
      locationRestrictions: [],
      timezoneRestrictions: [],
      workMode: remote ? "remote" : "onsite",
      description: htmlToText(str(j.description)),
      url,
      sourceUrl: url,
      postedAt: toDate(j.created_at),
      salary: null,
      tags: [...strArray(j.tags), ...strArray(j.job_types)],
      visaSponsorship: typeof visa === "boolean" ? visa : null,
    });
  }
  return out;
}

export async function fetchJobs(): Promise<Job[]> {
  const pages = [1, 2, 3];
  const results = await Promise.allSettled(
    pages.map((p) => fetchJson(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  return ok.flatMap((r) => parse(r.value));
}

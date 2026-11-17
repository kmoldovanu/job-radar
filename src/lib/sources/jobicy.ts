import type { Job } from "../types";
import { fetchJson, htmlToText, jobId, str, strArray, toDate, formatSalary } from "./util";

export function parse(data: unknown): Job[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const raw of jobs) {
    const j = raw as Record<string, unknown>;
    const title = decode(str(j.jobTitle));
    const url = str(j.url);
    if (!title || !url) continue;
    const geo = str(j.jobGeo);
    out.push({
      id: jobId("jobicy", str(j.id) || url),
      source: "jobicy",
      externalId: str(j.id) || url,
      title,
      company: decode(str(j.companyName)),
      location: geo || "Remote",
      locationRestrictions: geo ? geo.split(/,|;|\//).map((s) => s.trim()).filter(Boolean) : [],
      timezoneRestrictions: [],
      workMode: "remote",
      description: htmlToText(str(j.jobDescription) || str(j.jobExcerpt)),
      url,
      sourceUrl: url,
      postedAt: toDate(j.pubDate),
      salary: formatSalary(j.annualSalaryMin ?? j.salaryMin, j.annualSalaryMax ?? j.salaryMax, j.salaryCurrency),
      tags: [...strArray(j.jobIndustry), ...strArray(j.jobType), str(j.jobLevel)].filter(Boolean),
      visaSponsorship: null,
    });
  }
  return out;
}

function decode(s: string) {
  return htmlToText(s);
}

export async function fetchJobs(queries: string[]): Promise<Job[]> {
  const tags = queries.length ? queries.slice(0, 3) : [""];
  const results = await Promise.allSettled(
    tags.map((t) =>
      fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=100${t ? `&tag=${encodeURIComponent(t)}` : ""}`),
    ),
  );
  const ok = results.filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  return ok.flatMap((r) => parse(r.value));
}

import type { Job } from "../types";
import { fetchJson, guessWorkMode, htmlToText, jobId, str, toDate } from "./util";

export function parse(data: unknown, companyName: string, token: string): Job[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const raw of jobs) {
    const j = raw as Record<string, unknown>;
    const title = str(j.title);
    const url = str(j.absolute_url);
    if (!title || !url) continue;
    const location = str((j.location as Record<string, unknown>)?.name);
    const description = htmlToText(str(j.content));
    const offices = Array.isArray(j.offices)
      ? (j.offices as Record<string, unknown>[]).map((o) => str(o.name)).filter(Boolean)
      : [];
    out.push({
      id: jobId("greenhouse", `${token}:${str(j.id)}`),
      source: "greenhouse",
      externalId: `${token}:${str(j.id)}`,
      title,
      company: companyName,
      location,
      locationRestrictions: location ? [location, ...offices] : offices,
      timezoneRestrictions: [],
      workMode: guessWorkMode(location, title),
      description,
      url,
      sourceUrl: url,
      postedAt: toDate(j.first_published) ?? toDate(j.updated_at),
      salary: null,
      tags: Array.isArray(j.departments)
        ? (j.departments as Record<string, unknown>[]).map((d) => str(d.name)).filter(Boolean)
        : [],
      visaSponsorship: null,
    });
  }
  return out;
}

export async function fetchJobs(token: string, companyName: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    12000,
  );
  return parse(data, companyName, token);
}

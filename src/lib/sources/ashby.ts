import type { Job, WorkMode } from "../types";
import { fetchJson, guessWorkMode, htmlToText, jobId, str, toDate, formatSalary } from "./util";

export function parse(data: unknown, companyName: string, token: string): Job[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const raw of jobs) {
    const j = raw as Record<string, unknown>;
    if (j.isListed === false) continue;
    const title = str(j.title);
    const url = str(j.jobUrl) || str(j.applyUrl);
    if (!title || !url) continue;
    const location = str(j.location);
    const secondary = Array.isArray(j.secondaryLocations)
      ? (j.secondaryLocations as Record<string, unknown>[]).map((l) => str(l.location)).filter(Boolean)
      : [];
    const country = str(
      ((j.address as Record<string, unknown>)?.postalAddress as Record<string, unknown>)?.addressCountry,
    );
    const wt = str(j.workplaceType).toLowerCase();
    const workMode: WorkMode =
      wt === "remote" || j.isRemote === true
        ? "remote"
        : wt === "hybrid"
          ? "hybrid"
          : wt === "onsite"
            ? "onsite"
            : guessWorkMode(location, title);
    const comp = j.compensation as Record<string, unknown> | undefined;
    out.push({
      id: jobId("ashby", `${token}:${str(j.id) || url}`),
      source: "ashby",
      externalId: `${token}:${str(j.id) || url}`,
      title,
      company: companyName,
      location: [location, country && !location.includes(country) ? country : ""].filter(Boolean).join(", "),
      locationRestrictions: [location, ...secondary, country].filter(Boolean),
      timezoneRestrictions: [],
      workMode,
      description: str(j.descriptionPlain) || htmlToText(str(j.descriptionHtml)),
      url,
      sourceUrl: url,
      postedAt: toDate(j.publishedAt),
      salary: str(comp?.compensationTierSummary) || formatSalary(null, null),
      tags: [str(j.department), str(j.team), str(j.employmentType)].filter(Boolean),
      visaSponsorship: null,
    });
  }
  return out;
}

export async function fetchJobs(token: string, companyName: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`,
    12000,
  );
  return parse(data, companyName, token);
}

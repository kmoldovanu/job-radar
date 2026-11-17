import type { Job, WorkMode } from "../types";
import { fetchJson, guessWorkMode, htmlToText, jobId, str, strArray, toDate } from "./util";

export function parse(data: unknown, companyName: string, token: string): Job[] {
  if (!Array.isArray(data)) return [];
  const out: Job[] = [];
  for (const raw of data) {
    const j = raw as Record<string, unknown>;
    const title = str(j.text);
    const url = str(j.hostedUrl) || str(j.applyUrl);
    if (!title || !url) continue;
    const cat = (j.categories as Record<string, unknown>) ?? {};
    const location = str(cat.location);
    const all = strArray(cat.allLocations);
    const lists = Array.isArray(j.lists)
      ? (j.lists as Record<string, unknown>[]).map((l) => `${str(l.text)}\n${htmlToText(str(l.content))}`).join("\n\n")
      : "";
    const description = [
      str(j.descriptionPlain) || htmlToText(str(j.description)),
      lists,
      str(j.additionalPlain) || htmlToText(str(j.additional)),
    ]
      .filter(Boolean)
      .join("\n\n");
    const wt = str(j.workplaceType).toLowerCase();
    const workMode: WorkMode =
      wt === "remote" ? "remote" : wt === "hybrid" ? "hybrid" : wt === "onsite" || wt === "on-site" ? "onsite" : guessWorkMode(location, title);
    out.push({
      id: jobId("lever", `${token}:${str(j.id)}`),
      source: "lever",
      externalId: `${token}:${str(j.id)}`,
      title,
      company: companyName,
      location: [location, str(j.country)].filter(Boolean).join(", "),
      locationRestrictions: all.length ? all : location ? [location] : [],
      timezoneRestrictions: [],
      workMode,
      description,
      url,
      sourceUrl: url,
      postedAt: toDate(j.createdAt),
      salary: null,
      tags: [str(cat.team), str(cat.department), str(cat.commitment)].filter(Boolean),
      visaSponsorship: null,
    });
  }
  return out;
}

/** token può essere "eu:azienda" per le board ospitate su jobs.eu.lever.co */
export async function fetchJobs(token: string, companyName: string): Promise<Job[]> {
  const eu = token.startsWith("eu:");
  const slug = eu ? token.slice(3) : token;
  const host = eu ? "api.eu.lever.co" : "api.lever.co";
  const data = await fetchJson(`https://${host}/v0/postings/${encodeURIComponent(slug)}?mode=json`, 12000);
  return parse(data, companyName, token);
}

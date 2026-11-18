import type { Job } from "../types";
import { FETCH_HEADERS, guessWorkMode, htmlToText, jobId, str, toDate } from "./util";

/**
 * Jooble (aggregatore mondiale). API ufficiale: POST https://jooble.org/api/{chiave}
 * con corpo JSON { keywords, location, page }. Chiave gratuita su jooble.org/api/about.
 * Nota: Jooble restituisce solo un estratto dell'annuncio ("snippet"), non il testo intero.
 */
export function parse(data: unknown): Job[] {
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const raw of jobs) {
    const j = raw as Record<string, unknown>;
    const title = htmlToText(str(j.title));
    const link = str(j.link);
    if (!title || !link) continue;
    const externalId = str(j.id) || link;
    const location = htmlToText(str(j.location));
    const description = htmlToText(str(j.snippet));
    const type = str(j.type);
    out.push({
      id: jobId("jooble", externalId),
      source: "jooble",
      externalId,
      title,
      company: htmlToText(str(j.company)),
      location,
      locationRestrictions: location ? [location] : [],
      timezoneRestrictions: [],
      workMode: guessWorkMode(title, location, type, description),
      description,
      url: link,
      sourceUrl: link,
      postedAt: toDate(j.updated),
      salary: str(j.salary) || null,
      tags: [type, str(j.source)].filter(Boolean),
      visaSponsorship: null,
    });
  }
  return out;
}

export async function fetchJobs(location: string, queries: string[]): Promise<Job[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) throw new Error("JOOBLE_API_KEY non impostata");
  // Una sola richiesta per località: la chiave gratuita ha un numero limitato di richieste.
  const keywords = queries[0] ?? "";
  let res: Response;
  try {
    res = await fetch(`https://jooble.org/api/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { ...FETCH_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location, page: "1" }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch {
    throw new Error("Impossibile contattare jooble.org");
  }
  if (res.status === 403 || res.status === 401) throw new Error("Chiave Jooble non valida o esaurita");
  if (!res.ok) throw new Error(`HTTP ${res.status} da jooble.org`);
  return parse(await res.json());
}

import { asc } from "drizzle-orm";
import { z } from "zod";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { parseCareersUrl, prettyName } from "@/lib/sources/careers";
import { FETCH_HEADERS } from "@/lib/sources/util";
import { companies } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ companies: await getDb().select().from(companies).orderBy(asc(companies.name)) });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/** Aggiunge un'azienda dal link della sua pagina careers (Greenhouse, Lever, Ashby). */
export async function POST(req: Request) {
  try {
    const body = z.object({ url: z.string().trim().min(4), name: z.string().trim().optional() }).parse(await req.json());
    const url = /^https?:\/\//.test(body.url) ? body.url : `https://${body.url}`;
    let ref = parseCareersUrl(url);
    if (!ref) {
      // pagina careers "propria": cerchiamo nel suo HTML il link alla board ATS
      try {
        const res = await fetch(url, { headers: { ...FETCH_HEADERS, Accept: "text/html" }, signal: AbortSignal.timeout(8000) });
        ref = parseCareersUrl(await res.text());
      } catch {
        /* ignora */
      }
    }
    if (!ref) {
      return fail("Non riconosco la board: incolla un link boards.greenhouse.io/…, jobs.lever.co/… o jobs.ashbyhq.com/…");
    }
    const name = body.name || prettyName(ref.token);
    const [row] = await getDb()
      .insert(companies)
      .values({ ats: ref.ats, token: ref.token, name, url })
      .onConflictDoUpdate({ target: [companies.ats, companies.token], set: { name, url } })
      .returning();
    return ok({ company: row });
  } catch (e) {
    return toErrorResponse(e);
  }
}

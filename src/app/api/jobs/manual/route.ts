import { ok, toErrorResponse } from "@/lib/api";
import { checkGeo } from "@/lib/filters/geo";
import { checkLanguage } from "@/lib/filters/language";
import { quickMatch } from "@/lib/filters/match";
import { checkScam } from "@/lib/filters/scam";
import { manualJobSchema, parse } from "@/lib/sources/manual";
import { getProfile, upsertJobs } from "@/lib/store";

/** Annuncio incollato a mano: non viene scartato, ma gli avvisi dei filtri finiscono nelle note. */
export async function POST(req: Request) {
  try {
    const input = manualJobSchema.parse(await req.json());
    const job = parse(input);
    const { profile } = await getProfile();
    const match = quickMatch(job, profile);
    const geo = checkGeo(job, profile.preferences);
    const lang = checkLanguage(`${job.title}\n${job.description}`, profile);
    const scam = checkScam(job);
    for (const w of [geo.ok ? null : geo.detail, lang.ok ? null : lang.detail, scam.ok ? null : scam.detail]) {
      if (w) match.notes.unshift(`⚠️ ${w}`);
    }
    const res = await upsertJobs([{ ...job, match, adLanguage: lang.adLanguage }]);
    return ok({ id: job.id, ...res, warnings: match.notes });
  } catch (e) {
    return toErrorResponse(e);
  }
}

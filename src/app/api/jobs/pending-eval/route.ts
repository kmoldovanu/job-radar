import { and, desc, eq, isNull } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { hasAi } from "@/lib/ai/client";
import { getDb } from "@/lib/db";
import { getSettings, jobs } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Offerte ancora da valutare con l'AI, migliori prima (per punteggio rapido).
 * ?scope=top → le migliori N (Impostazioni) · ?scope=all → tutte (max 100) · ?scope=auto → come scelto in Cerca.
 */
export async function GET(req: Request) {
  try {
    if (!hasAi()) return ok({ ids: [], ai: false });
    const settings = await getSettings();
    const param = new URL(req.url).searchParams.get("scope");
    const scope = param === "top" || param === "all" ? param : settings.autoEvaluate;
    if (scope === "off") return ok({ ids: [], ai: true, scope });
    const limit = scope === "all" ? 100 : settings.aiEvaluateTop;
    const rows = await (await getDb())
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.status, "new"), isNull(jobs.aiEval)))
      .orderBy(desc(jobs.quickScore))
      .limit(limit);
    return ok({ ids: rows.map((r) => r.id), ai: true, scope });
  } catch (e) {
    return toErrorResponse(e);
  }
}

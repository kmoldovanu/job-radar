import { and, desc, eq, isNull } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { hasAi } from "@/lib/ai/client";
import { getDb } from "@/lib/db";
import { getSettings, jobs } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Le migliori N offerte (per punteggio rapido) ancora da valutare con l'AI. */
export async function GET() {
  try {
    if (!hasAi()) return ok({ ids: [], ai: false });
    const settings = await getSettings();
    const rows = await getDb()
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.status, "new"), isNull(jobs.aiEval)))
      .orderBy(desc(jobs.quickScore))
      .limit(settings.aiEvaluateTop);
    return ok({ ids: rows.map((r) => r.id), ai: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

import { and, eq } from "drizzle-orm";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { hasAi } from "@/lib/ai/client";
import { evaluateJob } from "@/lib/ai/tasks";
import { getJob, getProfile, getSettings, jobs, saveEvaluation } from "@/lib/store";

export const maxDuration = 60;

/**
 * Valuta UNA offerta con il modello veloce.
 * Se il punteggio AI è sotto la soglia delle Impostazioni, l'offerta va tra le scartate:
 * non viene più riproposta dalle ricerche (si può sempre ripristinare a mano).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!hasAi()) return fail("ANTHROPIC_API_KEY non impostata", 503);
    const id = decodeURIComponent((await ctx.params).id);
    const [job, { profile }, settings] = await Promise.all([getJob(id), getProfile(), getSettings()]);
    if (!job) return fail("Offerta non trovata", 404);
    const ev = await evaluateJob(job, profile, settings.evalModel);
    await saveEvaluation(id, ev);
    let hidden = false;
    if (settings.autoHideBelow > 0 && ev.score < settings.autoHideBelow) {
      const res = await (await getDb())
        .update(jobs)
        .set({ status: "dismissed" })
        .where(and(eq(jobs.id, id), eq(jobs.status, "new")))
        .returning({ id: jobs.id });
      hidden = res.length > 0;
    }
    return ok({ id, evaluation: ev, hidden });
  } catch (e) {
    return toErrorResponse(e);
  }
}

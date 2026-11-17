import { fail, ok, toErrorResponse } from "@/lib/api";
import { hasAi } from "@/lib/ai/client";
import { evaluateJob } from "@/lib/ai/tasks";
import { getJob, getProfile, getSettings, saveEvaluation } from "@/lib/store";

export const maxDuration = 60;

/** Valuta UNA offerta con il modello veloce. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!hasAi()) return fail("ANTHROPIC_API_KEY non impostata", 503);
    const id = decodeURIComponent((await ctx.params).id);
    const [job, { profile }, settings] = await Promise.all([getJob(id), getProfile(), getSettings()]);
    if (!job) return fail("Offerta non trovata", 404);
    const ev = await evaluateJob(job, profile, settings.evalModel);
    await saveEvaluation(id, ev);
    return ok({ id, evaluation: ev });
  } catch (e) {
    return toErrorResponse(e);
  }
}

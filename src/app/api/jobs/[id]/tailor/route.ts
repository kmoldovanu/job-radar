import { fail, ok, toErrorResponse } from "@/lib/api";
import { hasAi } from "@/lib/ai/client";
import { tailorApplication } from "@/lib/ai/tasks";
import { getDb } from "@/lib/db";
import { detectLanguage } from "@/lib/filters/language";
import { getJob, getProfile, getSettings, tailored } from "@/lib/store";
import { CV_LANGS, type CvLang } from "@/lib/types";

export const maxDuration = 60;

/** Genera CV + lettera su misura per UNA offerta (modello di scrittura). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!hasAi()) return fail("ANTHROPIC_API_KEY non impostata", 503);
    const id = decodeURIComponent((await ctx.params).id);
    const [job, { profile, exists }, settings] = await Promise.all([getJob(id), getProfile(), getSettings()]);
    if (!job) return fail("Offerta non trovata", 404);
    if (!exists || !profile.experience.length) return fail("Prima carica il tuo CV nella pagina Profilo", 400);

    const guess = job.aiEval?.applicationLanguage ?? job.adLanguage ?? detectLanguage(job.description) ?? "en";
    const language: CvLang = (CV_LANGS as readonly string[]).includes(guess) ? (guess as CvLang) : "en";
    const res = await tailorApplication(job, profile, language, job.aiEval?.keywords ?? [], settings.writeModel);

    const [row] = await getDb()
      .insert(tailored)
      .values({ jobId: id, language, cv: res.cv, letter: res.letter, corrections: res.corrections, model: settings.writeModel })
      .returning();
    return ok({ tailored: row });
  } catch (e) {
    return toErrorResponse(e);
  }
}

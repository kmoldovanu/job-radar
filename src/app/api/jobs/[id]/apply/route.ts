import { eq } from "drizzle-orm";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { applications, getJob, getSettings, jobs, latestTailored } from "@/lib/store";

/** "✅ Candidato!": sposta l'offerta nel tracker con data e promemoria. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeURIComponent((await ctx.params).id);
    const job = await getJob(id);
    if (!job) return fail("Offerta non trovata", 404);
    const [settings, t] = await Promise.all([getSettings(), latestTailored(id)]);
    const now = new Date();
    const db = await getDb();
    await db.update(jobs).set({ status: "applied" }).where(eq(jobs.id, id));
    await db
      .insert(applications)
      .values({
        jobId: id,
        status: "inviata",
        appliedAt: now,
        followUpAt: new Date(now.getTime() + settings.followUpDays * 86_400_000),
        tailoredId: t?.id ?? null,
      })
      .onConflictDoNothing();
    return ok({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

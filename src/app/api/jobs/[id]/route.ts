import { eq } from "drizzle-orm";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { applications, getJob, latestTailored } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeURIComponent((await ctx.params).id);
    const job = await getJob(id);
    if (!job) return fail("Offerta non trovata", 404);
    const [t, app] = await Promise.all([
      latestTailored(id),
      getDb().select().from(applications).where(eq(applications.jobId, id)),
    ]);
    return ok({ job, tailored: t, application: app[0] ?? null });
  } catch (e) {
    return toErrorResponse(e);
  }
}

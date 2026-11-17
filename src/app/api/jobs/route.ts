import { and, desc, eq, sql } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Offerte nuove (non candidate, non scartate) ordinate per punteggio. */
export async function GET() {
  try {
    const db = getDb();
    const score = sql<number>`coalesce(${jobs.aiScore}, ${jobs.quickScore})`;
    const rows = await db
      .select({
        id: jobs.id, source: jobs.source, title: jobs.title, company: jobs.company, location: jobs.location,
        workMode: jobs.workMode, url: jobs.url, sourceUrl: jobs.sourceUrl, postedAt: jobs.postedAt, salary: jobs.salary,
        quickScore: jobs.quickScore, aiScore: jobs.aiScore, aiEval: jobs.aiEval, match: jobs.match,
        adLanguage: jobs.adLanguage, createdAt: jobs.createdAt,
        hasTailored: sql<boolean>`exists (select 1 from "tailored" t where t.job_id = "jobs"."id")`,
      })
      .from(jobs)
      .where(and(eq(jobs.status, "new")))
      .orderBy(desc(score), desc(jobs.createdAt))
      .limit(300);
    return ok({ jobs: rows });
  } catch (e) {
    return toErrorResponse(e);
  }
}

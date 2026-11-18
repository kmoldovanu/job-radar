import { and, desc, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/store";

export const dynamic = "force-dynamic";

const VIEWS = ["new", "seen", "all", "dismissed"] as const;
type View = (typeof VIEWS)[number];

/**
 * Offerte per vista:
 * - new: ancora da vedere (mai aperte) · seen: già viste · all: tutte le attive · dismissed: scartate
 * Ordinamento: score (punteggio) oppure recent (arrivate per ultime).
 */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const view: View = (VIEWS as readonly string[]).includes(params.get("view") ?? "") ? (params.get("view") as View) : "new";
    const sort = params.get("sort") === "recent" ? "recent" : "score";

    const db = getDb();
    const score = sql<number>`coalesce(${jobs.aiScore}, ${jobs.quickScore})`;
    const where: Record<View, SQL | undefined> = {
      new: and(eq(jobs.status, "new"), isNull(jobs.seenAt)),
      seen: and(eq(jobs.status, "new"), isNotNull(jobs.seenAt)),
      all: eq(jobs.status, "new"),
      dismissed: eq(jobs.status, "dismissed"),
    };
    const order = sort === "recent" ? [desc(jobs.createdAt), desc(score)] : [desc(score), desc(jobs.createdAt)];

    const [rows, [counts]] = await Promise.all([
      db
        .select({
          id: jobs.id, source: jobs.source, title: jobs.title, company: jobs.company, location: jobs.location,
          workMode: jobs.workMode, url: jobs.url, sourceUrl: jobs.sourceUrl, postedAt: jobs.postedAt, salary: jobs.salary,
          quickScore: jobs.quickScore, aiScore: jobs.aiScore, aiEval: jobs.aiEval, match: jobs.match,
          adLanguage: jobs.adLanguage, createdAt: jobs.createdAt, seenAt: jobs.seenAt, status: jobs.status,
          hasTailored: sql<boolean>`exists (select 1 from "tailored" t where t.job_id = "jobs"."id")`,
        })
        .from(jobs)
        .where(where[view])
        .orderBy(...order)
        .limit(300),
      db
        .select({
          new: sql<number>`count(*) filter (where ${jobs.status} = 'new' and ${jobs.seenAt} is null)::int`,
          seen: sql<number>`count(*) filter (where ${jobs.status} = 'new' and ${jobs.seenAt} is not null)::int`,
          all: sql<number>`count(*) filter (where ${jobs.status} = 'new')::int`,
          dismissed: sql<number>`count(*) filter (where ${jobs.status} = 'dismissed')::int`,
          noAi: sql<number>`count(*) filter (where ${jobs.status} = 'new' and ${jobs.aiEval} is null)::int`,
        })
        .from(jobs),
    ]);
    return ok({ jobs: rows, counts, view, sort });
  } catch (e) {
    return toErrorResponse(e);
  }
}

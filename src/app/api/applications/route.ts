import { desc, eq } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { applications, jobs, tailored } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getDb()
      .select({
        id: applications.id,
        jobId: applications.jobId,
        status: applications.status,
        appliedAt: applications.appliedAt,
        notes: applications.notes,
        followUpAt: applications.followUpAt,
        followUpDone: applications.followUpDone,
        tailoredId: applications.tailoredId,
        cvLanguage: tailored.language,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        url: jobs.url,
        source: jobs.source,
        sourceUrl: jobs.sourceUrl,
        aiScore: jobs.aiScore,
        quickScore: jobs.quickScore,
      })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .leftJoin(tailored, eq(tailored.id, applications.tailoredId))
      .orderBy(desc(applications.appliedAt));
    return ok({ applications: rows });
  } catch (e) {
    return toErrorResponse(e);
  }
}

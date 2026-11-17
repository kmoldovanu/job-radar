import { desc, eq } from "drizzle-orm";
import { toErrorResponse } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { applications, jobs, tailored } from "@/lib/store";
import { SOURCE_LABELS, type SourceId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getDb()
      .select({ a: applications, j: jobs, lang: tailored.language })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .leftJoin(tailored, eq(tailored.id, applications.tailoredId))
      .orderBy(desc(applications.appliedAt));
    const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
    const csv = toCsv([
      ["Data candidatura", "Azienda", "Ruolo", "Località", "Stato", "Follow-up", "Follow-up fatto", "Punteggio", "CV usato (lingua)", "Fonte", "Link", "Note"],
      ...rows.map(({ a, j, lang }) => [
        d(a.appliedAt), j.company, j.title, j.location, a.status, d(a.followUpAt), a.followUpDone ? "sì" : "no",
        j.aiScore ?? j.quickScore, lang ? `su misura (${lang})` : "master", SOURCE_LABELS[j.source as SourceId]?.name ?? j.source,
        j.url, a.notes,
      ]),
    ]);
    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="candidature_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

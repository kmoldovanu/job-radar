import { and, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/store";

const bodySchema = z.object({ ids: z.array(z.string().max(500)).min(1).max(300) });

/** Segna in blocco come viste le offerte indicate. */
export async function POST(req: Request) {
  try {
    const { ids } = bodySchema.parse(await req.json());
    const res = await getDb()
      .update(jobs)
      .set({ seenAt: new Date() })
      .where(and(inArray(jobs.id, ids), isNull(jobs.seenAt)))
      .returning({ id: jobs.id });
    return ok({ updated: res.length });
  } catch (e) {
    return toErrorResponse(e);
  }
}

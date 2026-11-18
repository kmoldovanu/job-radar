import { and, eq } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/store";

/** Riporta tra le offerte attive un'offerta scartata con "Non mi interessa". */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeURIComponent((await ctx.params).id);
    await getDb()
      .update(jobs)
      .set({ status: "new" })
      .where(and(eq(jobs.id, id), eq(jobs.status, "dismissed")));
    return ok({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

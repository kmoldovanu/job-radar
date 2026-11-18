import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/store";

const bodySchema = z.object({ seen: z.boolean().default(true) });

/** Segna un'offerta come vista (o di nuovo da vedere). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeURIComponent((await ctx.params).id);
    const { seen } = bodySchema.parse(await req.json().catch(() => ({})));
    await getDb().update(jobs).set({ seenAt: seen ? new Date() : null }).where(eq(jobs.id, id));
    return ok({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

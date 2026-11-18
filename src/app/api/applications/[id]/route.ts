import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { applications } from "@/lib/store";
import { APPLICATION_STATUSES } from "@/lib/types";

const patchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(10000).optional(),
  followUpDone: z.boolean().optional(),
  followUpAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const p = patchSchema.parse(await req.json());
    const set: Partial<typeof applications.$inferInsert> = { updatedAt: new Date() };
    if (p.status) set.status = p.status;
    if (p.notes !== undefined) set.notes = p.notes;
    if (p.followUpDone !== undefined) set.followUpDone = p.followUpDone;
    if (p.followUpAt !== undefined) set.followUpAt = p.followUpAt ? new Date(p.followUpAt) : null;
    const [row] = await (await getDb())
      .update(applications)
      .set(set)
      .where(eq(applications.id, Number((await ctx.params).id)))
      .returning();
    return ok({ application: row });
  } catch (e) {
    return toErrorResponse(e);
  }
}

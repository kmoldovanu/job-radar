import { eq } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/store";

/** "Non mi interessa": nasconde per sempre (non verrà riproposta né sovrascritta). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeURIComponent((await ctx.params).id);
    await (await getDb()).update(jobs).set({ status: "dismissed" }).where(eq(jobs.id, id));
    return ok({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

import { eq } from "drizzle-orm";
import { ok, toErrorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { companies } from "@/lib/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await (await getDb()).delete(companies).where(eq(companies.id, Number((await ctx.params).id)));
    return ok({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

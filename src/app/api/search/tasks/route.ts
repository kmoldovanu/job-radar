import { ok, toErrorResponse } from "@/lib/api";
import { searchQueries } from "@/lib/cv/signals";
import { buildTasks } from "@/lib/search";
import { getProfile, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings, { profile }] = await Promise.all([getSettings(), getProfile()]);
    const queries = searchQueries(profile);
    return ok({ tasks: await buildTasks(settings), queries, hasRoles: queries.length > 0 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

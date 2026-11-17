import { ok, toErrorResponse } from "@/lib/api";
import { buildTasks } from "@/lib/search";
import { getProfile, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings, { profile }] = await Promise.all([getSettings(), getProfile()]);
    return ok({ tasks: await buildTasks(settings), hasRoles: profile.preferences.targetRoles.length > 0 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

import { fail, ok, toErrorResponse } from "@/lib/api";
import { buildTasks, runSearchTask } from "@/lib/search";
import { getProfile, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ricerca automatica (Vercel Cron, ogni mattina). Protetta da CRON_SECRET.
 * Esegue solo ricerca + filtri (niente AI): le fonti girano in parallelo con timeout brevi.
 * La valutazione AI la fai dall'app con "Valuta con AI".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("CRON_SECRET non impostata", 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Non autorizzato", 401);
  try {
    const [settings, { profile }] = await Promise.all([getSettings(), getProfile()]);
    const tasks = (await buildTasks(settings)).slice(0, 25);
    const results = await Promise.allSettled(tasks.map((t) => runSearchTask(t, profile, settings)));
    return ok({
      tasks: tasks.length,
      inserted: results.reduce((n, r) => n + (r.status === "fulfilled" ? r.value.inserted : 0), 0),
      failed: results.filter((r) => r.status === "rejected").length,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

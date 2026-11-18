import { fail, ok, toErrorResponse } from "@/lib/api";
import { demoEnabled } from "@/lib/demo";
import { seedDemo } from "@/lib/demo-seed";

export const dynamic = "force-dynamic";

/**
 * Riporta la demo ai dati di esempio iniziali (Vercel Cron, ogni notte). Protetta da CRON_SECRET.
 * Tocca solo DEMO_DATABASE_URL, mai il tuo database.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("CRON_SECRET non impostata", 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Non autorizzato", 401);
  if (!demoEnabled()) return fail("DEMO_DATABASE_URL non impostata", 503);
  try {
    return ok(await seedDemo());
  } catch (e) {
    return toErrorResponse(e);
  }
}

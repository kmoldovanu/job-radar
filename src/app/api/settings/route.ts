import { ok, toErrorResponse } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/store";
import { settingsSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

function envStatus() {
  const s = process.env.SESSION_SECRET ?? "";
  return {
    DATABASE_URL: !!process.env.DATABASE_URL,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    ADZUNA_APP_ID: !!process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: !!process.env.ADZUNA_APP_KEY,
    APP_PASSWORD: !!process.env.APP_PASSWORD,
    SESSION_SECRET: s.length >= 16,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };
}

export async function GET() {
  try {
    const env = envStatus();
    const settings = env.DATABASE_URL ? await getSettings() : settingsSchema.parse({});
    return ok({ settings, env });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const data = settingsSchema.parse(await req.json());
    await saveSettings(data);
    return ok({ settings: data });
  } catch (e) {
    return toErrorResponse(e);
  }
}

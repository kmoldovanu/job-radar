import { ok, toErrorResponse } from "@/lib/api";
import { buildTextIndex } from "@/lib/cv/signals";
import { getProfile, rescoreOpenJobs, saveProfile } from "@/lib/store";
import { profileSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile, exists, cvFile } = await getProfile();
    return ok({ profile, exists, cvFile });
  } catch (e) {
    return toErrorResponse(e);
  }
}

/** Salva il profilo e ricalcola il punteggio rapido delle offerte ancora aperte. */
export async function PUT(req: Request) {
  try {
    const data = profileSchema.parse(await req.json());
    // un indice ricavato dal testo segue le modifiche al profilo (titoli, competenze); quello dell'AI resta com'è
    if (data.cvIndex?.source !== "ai") {
      const { rawText } = await getProfile();
      if (rawText) data.cvIndex = buildTextIndex(rawText, data);
    }
    await saveProfile(data);
    const rescored = await rescoreOpenJobs(data);
    return ok({ profile: data, rescored });
  } catch (e) {
    return toErrorResponse(e);
  }
}

import { fail, ok, toErrorResponse } from "@/lib/api";
import { hasAi } from "@/lib/ai/client";
import { extractProfile } from "@/lib/ai/tasks";
import { extractCvText } from "@/lib/cv/extract";
import { getProfile, getSettings, saveProfile } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Carica il CV (PDF/DOCX) → testo → profilo strutturato (CV master) con l'AI. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Nessun file caricato");
    if (file.size > 5 * 1024 * 1024) return fail("File troppo grande (max 5 MB)");
    const text = await extractCvText({ name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
    if (text.length < 100) return fail("Non riesco a leggere il testo del CV (è una scansione?)");

    const { profile: previous } = await getProfile();
    if (!hasAi()) {
      // senza AI salviamo solo il testo: il profilo va compilato a mano
      await saveProfile(previous, text);
      return ok({ profile: previous, rawText: text, ai: false });
    }
    const settings = await getSettings();
    const profile = await extractProfile(text, settings.writeModel, previous);
    await saveProfile(profile, text);
    return ok({ profile, ai: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

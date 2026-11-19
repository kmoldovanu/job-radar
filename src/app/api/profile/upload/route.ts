import { fail, ok, toErrorResponse } from "@/lib/api";
import { hasAi } from "@/lib/ai/client";
import { extractProfile } from "@/lib/ai/tasks";
import { extractCvText } from "@/lib/cv/extract";
import { buildTextIndex } from "@/lib/cv/signals";
import { getProfile, getSettings, rescoreOpenJobs, saveProfile } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Carica il CV (PDF/DOCX): salva il file originale, ne estrae il testo e costruisce
 * il CV master + l'indice di ricerca (con l'AI se c'è la chiave, altrimenti dal testo).
 * Poi ricalcola il punteggio rapido delle offerte già trovate.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Nessun file caricato");
    if (file.size > 5 * 1024 * 1024) return fail("File troppo grande (max 5 MB)");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await extractCvText({ name: file.name, type: file.type, bytes: bytes.slice() });
    if (text.length < 100) return fail("Non riesco a leggere il testo del CV (è una scansione?)");
    const saved = { name: file.name, type: file.type || guessType(file.name), bytes };

    const { profile: previous } = await getProfile();
    const ai = hasAi();
    const profile = ai
      ? await extractProfile(text, (await getSettings()).writeModel, previous)
      : // senza AI: il profilo resta quello scritto a mano, l'indice si ricava dal testo del CV
        { ...previous, cvIndex: buildTextIndex(text, previous) };
    await saveProfile(profile, text, saved);
    const rescored = await rescoreOpenJobs(profile);
    return ok({ profile, ai, rescored, cvFile: { name: saved.name, type: saved.type, size: bytes.byteLength, uploadedAt: new Date() } });
  } catch (e) {
    return toErrorResponse(e);
  }
}

function guessType(name: string): string {
  return name.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

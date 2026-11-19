import { fail, toErrorResponse } from "@/lib/api";
import { getCvFile } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scarica il file del CV caricato, così com'era. */
export async function GET() {
  try {
    const file = await getCvFile();
    if (!file) return fail("Nessun CV caricato", 404);
    const ascii = file.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.type,
        "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

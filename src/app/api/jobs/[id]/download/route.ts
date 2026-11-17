import { eq } from "drizzle-orm";
import { fail, toErrorResponse } from "@/lib/api";
import { renderCvDocx, renderLetterDocx } from "@/lib/cv/docx";
import { renderCvPdf, renderLetterPdf } from "@/lib/cv/pdf";
import { getDb } from "@/lib/db";
import { getJob, latestTailored, tailored } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
}

/** ?doc=cv|letter&format=pdf|docx[&tid=<id versione>] */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeURIComponent((await ctx.params).id);
    const url = new URL(req.url);
    const doc = url.searchParams.get("doc") === "letter" ? "letter" : "cv";
    const format = url.searchParams.get("format") === "docx" ? "docx" : "pdf";
    const tid = Number(url.searchParams.get("tid"));
    const t = tid
      ? (await getDb().select().from(tailored).where(eq(tailored.id, tid)))[0]
      : await latestTailored(id);
    if (!t) return fail("Nessun CV su misura per questa offerta", 404);
    const job = await getJob(t.jobId);

    let body: Buffer;
    if (doc === "cv") body = format === "pdf" ? await renderCvPdf(t.cv) : await renderCvDocx(t.cv);
    else body = format === "pdf" ? await renderLetterPdf(t.cv, t.letter) : await renderLetterDocx(t.cv, t.letter);

    const name = `${doc === "cv" ? "CV" : "Lettera"}_${slug(t.cv.name || "candidato")}_${slug(job?.company ?? "")}.${format}`;
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type":
          format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

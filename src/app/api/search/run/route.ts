import { z } from "zod";
import { ok, toErrorResponse } from "@/lib/api";
import { runSearchTask, SEARCHABLE } from "@/lib/search";
import { getProfile, getSettings } from "@/lib/store";

export const maxDuration = 30;

const bodySchema = z.object({ source: z.enum(SEARCHABLE), param: z.string().optional(), label: z.string().default("") });

/** Interroga UNA fonte (o un paese Adzuna, o un'azienda). Il client le chiama in parallelo. */
export async function POST(req: Request) {
  try {
    const task = bodySchema.parse(await req.json());
    const [settings, { profile }] = await Promise.all([getSettings(), getProfile()]);
    return ok(await runSearchTask(task, profile, settings));
  } catch (e) {
    return toErrorResponse(e);
  }
}

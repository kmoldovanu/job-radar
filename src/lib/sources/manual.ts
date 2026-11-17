import { z } from "zod";
import type { Job } from "../types";
import { guessWorkMode, jobId } from "./util";

export const manualJobSchema = z.object({
  title: z.string().trim().min(2, "Titolo obbligatorio"),
  company: z.string().trim().min(1, "Azienda obbligatoria"),
  url: z.string().trim().url("Link non valido"),
  location: z.string().trim().default(""),
  description: z.string().trim().min(30, "Incolla il testo dell'annuncio"),
});
export type ManualJobInput = z.infer<typeof manualJobSchema>;

/** Annunci incollati a mano (LinkedIn, Indeed…). */
export function parse(input: ManualJobInput, now = new Date()): Job {
  const externalId = input.url.replace(/[?#].*$/, "");
  return {
    id: jobId("manual", externalId),
    source: "manual",
    externalId,
    title: input.title,
    company: input.company,
    location: input.location,
    locationRestrictions: input.location ? [input.location] : [],
    timezoneRestrictions: [],
    workMode: guessWorkMode(input.location, input.title, input.description.slice(0, 600)),
    description: input.description,
    url: input.url,
    sourceUrl: input.url,
    postedAt: now,
    salary: null,
    tags: [],
    visaSponsorship: null,
  };
}

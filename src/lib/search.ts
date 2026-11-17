import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { runFilters, type Rejection } from "./filters/pipeline";
import * as adzuna from "./sources/adzuna";
import * as arbeitnow from "./sources/arbeitnow";
import * as ashby from "./sources/ashby";
import * as greenhouse from "./sources/greenhouse";
import * as himalayas from "./sources/himalayas";
import * as jobicy from "./sources/jobicy";
import * as lever from "./sources/lever";
import * as remoteok from "./sources/remoteok";
import { companies, upsertJobs } from "./store";
import type { Job, Profile, RejectReason, Settings } from "./types";

export const SEARCHABLE = ["himalayas", "remoteok", "jobicy", "arbeitnow", "adzuna", "company"] as const;
export type SearchSource = (typeof SEARCHABLE)[number];

export interface SearchTask {
  source: SearchSource;
  /** paese Adzuna o id azienda */
  param?: string;
  label: string;
}

export interface SearchResult {
  label: string;
  fetched: number;
  inserted: number;
  updated: number;
  rejected: Partial<Record<RejectReason, number>>;
  samples: Rejection[];
}

async function fetchFor(task: SearchTask, profile: Profile, settings: Settings): Promise<Job[]> {
  const queries = profile.preferences.targetRoles.map((r) => r.trim()).filter(Boolean);
  switch (task.source) {
    case "himalayas":
      return himalayas.fetchJobs(queries);
    case "remoteok":
      return remoteok.fetchJobs();
    case "jobicy":
      return jobicy.fetchJobs(queries);
    case "arbeitnow":
      return arbeitnow.fetchJobs();
    case "adzuna": {
      const c = (task.param ?? "").toLowerCase();
      if (!/^[a-z]{2}$/.test(c)) throw new Error("Paese Adzuna non valido");
      return adzuna.fetchJobs(c, queries, settings.maxAgeDays);
    }
    case "company": {
      const id = Number(task.param);
      const [co] = await getDb().select().from(companies).where(eq(companies.id, id));
      if (!co) throw new Error("Azienda non trovata");
      if (co.ats === "greenhouse") return greenhouse.fetchJobs(co.token, co.name);
      if (co.ats === "lever") return lever.fetchJobs(co.token, co.name);
      if (co.ats === "ashby") return ashby.fetchJobs(co.token, co.name);
      throw new Error(`ATS sconosciuto: ${co.ats}`);
    }
  }
}

/** Una sola fonte per chiamata: scarica, filtra, salva. */
export async function runSearchTask(task: SearchTask, profile: Profile, settings: Settings): Promise<SearchResult> {
  const raw = await fetchFor(task, profile, settings);
  const { kept, rejected, samples } = runFilters(raw, profile, settings);
  const saved = await upsertJobs(kept);
  if (saved.skipped) rejected.duplicato = (rejected.duplicato ?? 0) + saved.skipped;
  return { label: task.label, fetched: raw.length, inserted: saved.inserted, updated: saved.updated, rejected, samples };
}

export async function buildTasks(settings: Settings): Promise<SearchTask[]> {
  const tasks: SearchTask[] = [];
  if (settings.sources.himalayas) tasks.push({ source: "himalayas", label: "Himalayas" });
  if (settings.sources.remoteok) tasks.push({ source: "remoteok", label: "Remote OK" });
  if (settings.sources.jobicy) tasks.push({ source: "jobicy", label: "Jobicy" });
  if (settings.sources.arbeitnow) tasks.push({ source: "arbeitnow", label: "Arbeitnow" });
  if (settings.sources.adzuna && process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    for (const c of settings.adzunaCountries) tasks.push({ source: "adzuna", param: c, label: `Adzuna ${c.toUpperCase()}` });
  }
  if (settings.sources.companies) {
    const list = await getDb().select().from(companies);
    for (const co of list) tasks.push({ source: "company", param: String(co.id), label: co.name });
  }
  return tasks;
}

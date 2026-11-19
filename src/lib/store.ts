import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { ensureCvColumns } from "./db/ensure";
import { quickMatch } from "./filters/match";
import type { KeptJob } from "./filters/pipeline";
import { dedupeKey } from "./sources/util";
import {
  defaultSettings, emptyProfile, profileSchema, settingsSchema, type AiEvaluation, type Profile, type Settings,
} from "./types";

const { jobs, profile, settings, applications, tailored, companies } = schema;

/** Database con le colonne del file del CV pronte (vedi db/ensure.ts). */
async function profileDb() {
  const db = await getDb();
  await ensureCvColumns(db);
  return db;
}

export interface CvFileInfo {
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export async function getProfile(): Promise<{ profile: Profile; rawText: string; exists: boolean; cvFile: CvFileInfo | null }> {
  const rows = await (await profileDb())
    .select({
      data: profile.data, rawText: profile.rawText, cvFileName: profile.cvFileName, cvFileType: profile.cvFileType,
      cvFileSize: profile.cvFileSize, cvUploadedAt: profile.cvUploadedAt,
    })
    .from(profile)
    .where(eq(profile.id, 1));
  const row = rows[0];
  if (!row) return { profile: emptyProfile(), rawText: "", exists: false, cvFile: null };
  const parsed = profileSchema.safeParse(row.data);
  const cvFile =
    row.cvFileName && row.cvUploadedAt
      ? { name: row.cvFileName, type: row.cvFileType ?? "", size: row.cvFileSize ?? 0, uploadedAt: row.cvUploadedAt }
      : null;
  return { profile: parsed.success ? parsed.data : emptyProfile(), rawText: row.rawText, exists: true, cvFile };
}

export async function saveProfile(data: Profile, rawText?: string, file?: { name: string; type: string; bytes: Uint8Array }) {
  const values = {
    id: 1,
    data,
    updatedAt: new Date(),
    ...(rawText !== undefined ? { rawText } : {}),
    ...(file
      ? {
          cvFileName: file.name.slice(0, 200),
          cvFileType: file.type.slice(0, 120),
          cvFileSize: file.bytes.byteLength,
          cvFileData: Buffer.from(file.bytes).toString("base64"),
          cvUploadedAt: new Date(),
        }
      : {}),
  };
  await (await profileDb())
    .insert(profile)
    .values({ rawText: "", ...values })
    .onConflictDoUpdate({ target: profile.id, set: values });
}

/** Il file del CV caricato, per scaricarlo di nuovo. */
export async function getCvFile(): Promise<{ name: string; type: string; bytes: Buffer } | null> {
  const rows = await (await profileDb())
    .select({ name: profile.cvFileName, type: profile.cvFileType, data: profile.cvFileData })
    .from(profile)
    .where(eq(profile.id, 1));
  const r = rows[0];
  if (!r?.name || !r.data) return null;
  return { name: r.name, type: r.type || "application/octet-stream", bytes: Buffer.from(r.data, "base64") };
}

/**
 * Ricalcola il punteggio rapido delle offerte ancora aperte con il profilo attuale:
 * dopo un nuovo CV le offerte già trovate si riordinano subito, senza rifare la ricerca.
 */
export async function rescoreOpenJobs(p: Profile): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: jobs.id, title: jobs.title, description: jobs.description, tags: jobs.tags })
    .from(jobs)
    .where(eq(jobs.status, "new"));
  if (!rows.length) return 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map((r) => {
      const m = quickMatch({ title: r.title, description: r.description, tags: r.tags ?? [] }, p);
      return sql`(${r.id}, ${m.score}, ${JSON.stringify(m)})`;
    });
    await db.execute(
      sql`UPDATE "jobs" SET "quick_score" = v.score::int, "match" = v.match::jsonb FROM (VALUES ${sql.join(chunk, sql`, `)}) AS v(id, score, match) WHERE "jobs"."id" = v.id`,
    );
  }
  return rows.length;
}

export async function getSettings(): Promise<Settings> {
  const rows = await (await getDb()).select().from(settings).where(eq(settings.id, 1));
  if (!rows[0]) return defaultSettings();
  const parsed = settingsSchema.safeParse(rows[0].data);
  return parsed.success ? parsed.data : defaultSettings();
}

export async function saveSettings(data: Settings) {
  await (await getDb())
    .insert(settings)
    .values({ id: 1, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.id, set: { data, updatedAt: new Date() } });
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  /** già presenti come candidate/scartate, o lo stesso annuncio da un'altra fonte */
  skipped: number;
}

/**
 * Salva le offerte filtrate.
 * - Mai toccare offerte già candidate o scartate (status ≠ new).
 * - Lo stesso annuncio da un'altra fonte (stessa chiave azienda+titolo) non viene duplicato.
 * - Per le offerte "new" già presenti aggiorna solo punteggio rapido e lastSeenAt.
 */
export async function upsertJobs(list: KeptJob[]): Promise<UpsertResult> {
  if (!list.length) return { inserted: 0, updated: 0, skipped: 0 };
  const db = await getDb();
  const withKeys = list.map((j) => ({ job: j, key: dedupeKey(j.company, j.title) }));
  // dedup interno al batch
  const uniq = new Map<string, (typeof withKeys)[number]>();
  for (const w of withKeys) if (!uniq.has(w.key)) uniq.set(w.key, w);
  const items = [...uniq.values()];
  let skipped = list.length - items.length;

  const existing = await db
    .select({ id: jobs.id, dedupeKey: jobs.dedupeKey, status: jobs.status })
    .from(jobs)
    .where(
      sql`${inArray(jobs.id, items.map((i) => i.job.id))} OR ${inArray(jobs.dedupeKey, items.map((i) => i.key))}`,
    );
  const byId = new Map(existing.map((e) => [e.id, e]));
  const byKey = new Map(existing.map((e) => [e.dedupeKey, e]));

  const toInsert: (typeof jobs.$inferInsert)[] = [];
  const toTouch: { id: string; quickScore: number; match: KeptJob["match"] }[] = [];
  for (const { job, key } of items) {
    const ex = byId.get(job.id) ?? byKey.get(key);
    if (ex) {
      if (ex.status === "new" && ex.id === job.id) toTouch.push({ id: ex.id, quickScore: job.match.score, match: job.match });
      else skipped++;
      continue;
    }
    toInsert.push({
      id: job.id,
      source: job.source,
      externalId: job.externalId,
      dedupeKey: key,
      title: job.title.slice(0, 300),
      company: job.company.slice(0, 200),
      location: job.location.slice(0, 300),
      locationRestrictions: job.locationRestrictions,
      workMode: job.workMode,
      description: job.description.slice(0, 30000),
      url: job.url,
      sourceUrl: job.sourceUrl,
      postedAt: job.postedAt,
      salary: job.salary,
      tags: job.tags.slice(0, 20),
      visaSponsorship: job.visaSponsorship,
      adLanguage: job.adLanguage,
      quickScore: job.match.score,
      match: job.match,
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const res = await db.insert(jobs).values(toInsert).onConflictDoNothing().returning({ id: jobs.id });
    inserted = res.length;
    skipped += toInsert.length - res.length;
  }
  for (const t of toTouch) {
    await db
      .update(jobs)
      .set({ quickScore: t.quickScore, match: t.match, lastSeenAt: new Date() })
      .where(and(eq(jobs.id, t.id), eq(jobs.status, "new")));
  }
  return { inserted, updated: toTouch.length, skipped };
}

export async function getJob(id: string) {
  const rows = await (await getDb()).select().from(jobs).where(eq(jobs.id, id));
  return rows[0] ?? null;
}

export async function saveEvaluation(id: string, ev: AiEvaluation) {
  await (await getDb())
    .update(jobs)
    .set({ aiEval: ev, aiScore: Math.round(ev.score) })
    .where(eq(jobs.id, id));
}

export async function latestTailored(jobId: string) {
  const rows = await (await getDb())
    .select()
    .from(tailored)
    .where(eq(tailored.jobId, jobId))
    .orderBy(desc(tailored.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export { jobs, applications, tailored, companies, profile, settings };

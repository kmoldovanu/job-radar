import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AiEvaluation, MatchDetails, Profile, Settings, TailoredCv } from "../types";

/** Riga unica (id=1): il CV master. */
export const profile = pgTable("profile", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<Profile>().notNull(),
  rawText: text("raw_text").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Riga unica (id=1): impostazioni. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<Settings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location").notNull().default(""),
    locationRestrictions: jsonb("location_restrictions").$type<string[]>().notNull().default([]),
    workMode: text("work_mode").notNull().default("unknown"),
    description: text("description").notNull().default(""),
    url: text("url").notNull(),
    sourceUrl: text("source_url").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    salary: text("salary"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    visaSponsorship: boolean("visa_sponsorship"),
    adLanguage: text("ad_language"),
    quickScore: integer("quick_score").notNull().default(0),
    match: jsonb("match").$type<MatchDetails>(),
    aiScore: integer("ai_score"),
    aiEval: jsonb("ai_eval").$type<AiEvaluation>(),
    /** new | applied | dismissed */
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("jobs_dedupe_key_idx").on(t.dedupeKey),
    index("jobs_status_idx").on(t.status),
  ],
);

export const tailored = pgTable(
  "tailored",
  {
    id: serial("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    cv: jsonb("cv").$type<TailoredCv>().notNull(),
    letter: text("letter").notNull(),
    corrections: jsonb("corrections").$type<string[]>().notNull().default([]),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tailored_job_idx").on(t.jobId)],
);

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .unique()
    .references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("inviata"),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes").notNull().default(""),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  followUpDone: boolean("follow_up_done").notNull().default(false),
  tailoredId: integer("tailored_id").references(() => tailored.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    ats: text("ats").notNull(),
    token: text("token").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("companies_ats_token_idx").on(t.ats, t.token)],
);

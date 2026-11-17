CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'inviata' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"follow_up_at" timestamp with time zone,
	"follow_up_done" boolean DEFAULT false NOT NULL,
	"tailored_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"ats" text NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"location_restrictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"work_mode" text DEFAULT 'unknown' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"source_url" text NOT NULL,
	"posted_at" timestamp with time zone,
	"salary" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visa_sponsorship" boolean,
	"ad_language" text,
	"quick_score" integer DEFAULT 0 NOT NULL,
	"match" jsonb,
	"ai_score" integer,
	"ai_eval" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"raw_text" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailored" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"language" text NOT NULL,
	"cv" jsonb NOT NULL,
	"letter" text NOT NULL,
	"corrections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_tailored_id_tailored_id_fk" FOREIGN KEY ("tailored_id") REFERENCES "public"."tailored"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailored" ADD CONSTRAINT "tailored_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_ats_token_idx" ON "companies" USING btree ("ats","token");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_key_idx" ON "jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tailored_job_idx" ON "tailored" USING btree ("job_id");
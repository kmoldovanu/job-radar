ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "seen_at" timestamp with time zone;

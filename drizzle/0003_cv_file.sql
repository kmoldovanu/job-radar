-- File del CV caricato (l'app crea queste colonne anche da sola se la migrazione non è ancora stata lanciata).
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "cv_file_name" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "cv_file_type" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "cv_file_size" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "cv_file_data" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "cv_uploaded_at" timestamp with time zone;
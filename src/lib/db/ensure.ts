import { sql } from "drizzle-orm";
import type { getOwnerDb } from "./index";

type Db = ReturnType<typeof getOwnerDb>;
const ready = new WeakMap<Db, Promise<unknown>>();

/**
 * Colonne del file del CV (migrazione 0003_cv_file). Le crea anche l'app, una volta per connessione,
 * così tutto continua a funzionare se dopo l'aggiornamento non è ancora stato lanciato `npm run db:migrate`.
 */
export async function ensureCvColumns(db: Db): Promise<void> {
  let p = ready.get(db);
  if (!p) {
    p = db
      .execute(
        sql`ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "cv_file_name" text, ADD COLUMN IF NOT EXISTS "cv_file_type" text, ADD COLUMN IF NOT EXISTS "cv_file_size" integer, ADD COLUMN IF NOT EXISTS "cv_file_data" text, ADD COLUMN IF NOT EXISTS "cv_uploaded_at" timestamp with time zone`,
      )
      .catch((e) => {
        ready.delete(db);
        throw e;
      });
    ready.set(db, p);
  }
  await p;
}

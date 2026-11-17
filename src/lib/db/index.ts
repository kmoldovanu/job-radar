import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __jobRadarDb?: Db };

/** Connessione pigra: l'app parte anche senza DATABASE_URL (le pagine mostrano un avviso). */
export function getDb(): Db {
  if (globalForDb.__jobRadarDb) return globalForDb.__jobRadarDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL non impostata");
  // prepare:false è necessario con i pooler (Supabase/Neon in modalità transaction)
  const client = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  globalForDb.__jobRadarDb = drizzle(client, { schema });
  return globalForDb.__jobRadarDb;
}

export { schema };

import { cookies } from "next/headers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DEMO_PREFIX, SESSION_COOKIE } from "../auth";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __jobRadarDb?: Db; __jobRadarDemoDb?: Db };

function connect(url: string): Db {
  // prepare:false è necessario con i pooler (Supabase/Neon in modalità transaction)
  const client = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  return drizzle(client, { schema });
}

/** Database del proprietario. Connessione pigra: l'app parte anche senza DATABASE_URL (le pagine mostrano un avviso). */
export function getOwnerDb(): Db {
  if (globalForDb.__jobRadarDb) return globalForDb.__jobRadarDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL non impostata");
  return (globalForDb.__jobRadarDb = connect(url));
}

/** Database con i dati di esempio per l'accesso demo. */
export function getDemoDb(): Db {
  if (globalForDb.__jobRadarDemoDb) return globalForDb.__jobRadarDemoDb;
  const url = process.env.DEMO_DATABASE_URL;
  if (!url) throw new Error("DEMO_DATABASE_URL non impostata");
  return (globalForDb.__jobRadarDemoDb = connect(url));
}

/** true se la richiesta in corso viene da una sessione demo (la firma l'ha già verificata il proxy). */
export async function isDemoRequest(): Promise<boolean> {
  try {
    return (await cookies()).get(SESSION_COOKIE)?.value.startsWith(DEMO_PREFIX) ?? false;
  } catch {
    // fuori da una richiesta (script, test): sempre il database del proprietario
    return false;
  }
}

/** Il database giusto per chi sta facendo la richiesta: il tuo, oppure quello della demo. */
export async function getDb(): Promise<Db> {
  return (await isDemoRequest()) ? getDemoDb() : getOwnerDb();
}

export { schema };

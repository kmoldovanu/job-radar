/**
 * Accesso demo: un ospite entra da /demo senza password e vede dati di esempio
 * presi da un database separato (DEMO_DATABASE_URL). I tuoi dati non vengono mai letti né toccati.
 *
 * Nella demo funzionano le azioni che cambiano solo i dati di esempio (segna come vista, scarta,
 * ripristina, candidati, aggiorna una candidatura). Sono bloccate quelle che costano o che chiamano
 * servizi esterni: ricerca sulle fonti, AI, caricamento del CV, pagine carriere, impostazioni.
 * Ogni notte il cron /api/cron/demo-reset rimette i dati di esempio come all'inizio.
 */

export function demoEnabled(): boolean {
  return Boolean(process.env.DEMO_DATABASE_URL);
}

/** Scritture permesse a un ospite (metodo + percorso). */
const DEMO_WRITES: [string, RegExp][] = [
  ["POST", /^\/api\/auth\/logout$/],
  ["POST", /^\/api\/jobs\/seen$/],
  ["POST", /^\/api\/jobs\/[^/]+\/(seen|dismiss|restore|apply)$/],
  ["PATCH", /^\/api\/applications\/\d+$/],
];

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Letture bloccate: l'elenco delle richieste di ricerca è il primo passo di "Cerca", così l'ospite vede subito il messaggio. */
const DEMO_BLOCKED_READS = [/^\/api\/search\//];

export function demoCanRequest(method: string, pathname: string): boolean {
  if (READ_METHODS.has(method)) return !DEMO_BLOCKED_READS.some((re) => re.test(pathname));
  return DEMO_WRITES.some(([m, re]) => m === method && re.test(pathname));
}

export const DEMO_BLOCKED_MESSAGE =
  "Nella demo questa funzione è disattivata: chiamerebbe le fonti di lavoro o l'AI. Puoi esplorare offerte, CV pronti e candidature di esempio.";

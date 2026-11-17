import type { WorkMode } from "../types";

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: "…", bull: "•", euro: "€",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Rimuove l'HTML conservando gli a capo principali. Gestisce anche HTML "escaped" (Greenhouse). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = String(html);
  if (/&lt;\/?[a-z]/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function str(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

export function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return typeof v === "string" && v ? [v] : [];
  return v
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return str(o.name ?? o.location ?? o.label ?? o.alpha2 ?? o.value);
      }
      return str(x);
    })
    .filter(Boolean);
}

/** Converte secondi / millisecondi / stringa in Date. */
export function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = new Date(v < 1e12 ? v * 1000 : v);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v);
  if (/^\d+$/.test(s)) return toDate(Number(s));
  const d = new Date(s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") + "Z" : s);
  return isNaN(d.getTime()) ? null : d;
}

export function guessWorkMode(...texts: string[]): WorkMode {
  const t = texts.join(" ").toLowerCase();
  if (/\bhybrid|ibrido|hybride|hybrid-?arbeit/.test(t)) return "hybrid";
  if (/\bremote|anywhere|worldwide|work from home|da remoto|telelavoro|homeoffice|home office|télétravail|remoto\b/.test(t))
    return "remote";
  if (/on-?site|in office|in sede|vor ort/.test(t)) return "onsite";
  return "unknown";
}

export function formatSalary(min: unknown, max: unknown, currency?: unknown): string | null {
  const a = Number(min) || 0;
  const b = Number(max) || 0;
  if (!a && !b) return null;
  const cur = str(currency) || "";
  const f = (n: number) => Math.round(n).toLocaleString("it-IT");
  if (a && b && a !== b) return `${f(a)}–${f(b)} ${cur}`.trim();
  return `${f(a || b)} ${cur}`.trim();
}

/** Normalizza azienda+titolo per riconoscere lo stesso annuncio su fonti diverse. */
export function dedupeKey(company: string, title: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\b(inc|ltd|llc|gmbh|srl|spa|s\.?a\.?|bv|ag|plc|co)\b\.?/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(company)}|${norm(title)}`;
}

export function jobId(source: string, externalId: string): string {
  return `${source}:${externalId}`.slice(0, 200);
}

export const FETCH_HEADERS = {
  "User-Agent": "JobRadar/1.0 (personal job search app)",
  Accept: "application/json",
};

export async function fetchJson(url: string, timeoutMs = 9000): Promise<unknown> {
  const host = new URL(url).host;
  let res: Response;
  try {
    res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new Error(timeout ? `${host} non risponde (timeout)` : `Impossibile contattare ${host}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} da ${host}`);
  return res.json();
}

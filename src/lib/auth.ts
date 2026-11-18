/** Sessione firmata con HMAC-SHA256 (Web Crypto: funziona sia nel proxy sia nelle route). */

export const SESSION_COOKIE = "jr_session";
export const SESSION_DAYS = 30;
/** La sessione demo dura meno: chi guarda la demo non deve restarci dentro per un mese. */
export const DEMO_SESSION_DAYS = 1;
/** I token demo iniziano così: la firma usa un contesto diverso, quindi non si può trasformare in un token del proprietario. */
export const DEMO_PREFIX = "demo.";

/** owner = tu, con la password; demo = un ospite che guarda i dati di esempio. */
export type SessionKind = "owner" | "demo";

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${await hmac(secret, `jobradar:${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  return (await sessionKind(token, secret, now)) === "owner";
}

export async function createDemoToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + DEMO_SESSION_DAYS * 86_400_000);
  return `${DEMO_PREFIX}${exp}.${await hmac(secret, `jobradar-demo:${exp}`)}`;
}

/** Chi c'è dietro il cookie, con la firma verificata. null = nessuna sessione valida. */
export async function sessionKind(token: string | undefined, secret: string, now = Date.now()): Promise<SessionKind | null> {
  if (!token) return null;
  const demo = token.startsWith(DEMO_PREFIX);
  const [exp, sig] = (demo ? token.slice(DEMO_PREFIX.length) : token).split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return null;
  const expected = await hmac(secret, `${demo ? "jobradar-demo" : "jobradar"}:${exp}`);
  if (!safeEqual(sig, expected)) return null;
  return demo ? "demo" : "owner";
}

export async function checkPassword(input: string, expected: string): Promise<boolean> {
  // confronto a tempo costante tramite hash
  const [a, b] = await Promise.all([hmac("pw", input), hmac("pw", expected)]);
  return safeEqual(a, b);
}

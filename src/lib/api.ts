import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Converte qualsiasi eccezione in una risposta JSON leggibile. */
export function toErrorResponse(e: unknown) {
  if (e instanceof ZodError) return fail(e.issues.map((i) => i.message).join("; "), 400);
  let msg = e instanceof Error ? e.message : String(e);
  console.error("[api]", e);
  // errori del database: non mostrare la query, solo la causa
  if (msg.startsWith("Failed query") && e instanceof Error && e.cause instanceof Error) msg = `Errore database: ${e.cause.message}`;
  const status = /non impostata/.test(msg) ? 503 : /non trovat/.test(msg) ? 404 : 500;
  return fail(msg, status);
}

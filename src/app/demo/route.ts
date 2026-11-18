import { NextResponse, type NextRequest } from "next/server";
import { createDemoToken, DEMO_SESSION_DAYS, SESSION_COOKIE, sessionKind, sessionSecret } from "@/lib/auth";
import { demoEnabled } from "@/lib/demo";
import { seedDemo } from "@/lib/demo-seed";

export const dynamic = "force-dynamic";

/**
 * GET /demo: ingresso senza password per chi vuole provare l'app (è il link del portfolio).
 * Apre una sessione demo sul database con i dati di esempio. Se sei già entrato con la password
 * non cambia nulla: resti sui tuoi dati.
 */
export async function GET(req: NextRequest) {
  const home = new URL("/", req.url);
  const secret = sessionSecret();
  if (!secret || !process.env.APP_PASSWORD || !demoEnabled()) {
    return NextResponse.redirect(new URL("/login?demo=off", req.url));
  }

  if ((await sessionKind(req.cookies.get(SESSION_COOKIE)?.value, secret)) === "owner") {
    return NextResponse.redirect(home);
  }

  try {
    // Al primo ingresso il database demo è vuoto: lo riempie con i dati di esempio.
    await seedDemo({ onlyIfEmpty: true });
  } catch (e) {
    console.error("[demo] dati di esempio non caricati", e);
    return NextResponse.redirect(new URL("/login?demo=error", req.url));
  }

  const res = NextResponse.redirect(home);
  res.cookies.set(SESSION_COOKIE, await createDemoToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_SESSION_DAYS * 86400,
  });
  return res;
}

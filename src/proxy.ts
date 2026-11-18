import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionKind, sessionSecret } from "@/lib/auth";
import { DEMO_BLOCKED_MESSAGE, demoCanRequest, demoEnabled } from "@/lib/demo";

/**
 * Protezione di tutte le pagine e API (Next.js 16: "proxy" è il nuovo nome del middleware).
 * Libere: pagina di login, API di login, ingresso demo, manifest/icone PWA, cron (protetto da CRON_SECRET).
 */
const PUBLIC = [
  /^\/login$/,
  /^\/api\/auth\/login$/,
  /^\/demo$/,
  /^\/api\/cron\//,
  /^\/manifest\.webmanifest$/,
  /^\/sw\.js$/,
  /^\/offline\.html$/,
  /^\/icon/,
  /^\/apple-icon/,
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const secret = sessionSecret();
  const kind = secret && process.env.APP_PASSWORD
    ? await sessionKind(req.cookies.get(SESSION_COOKIE)?.value, secret)
    : null;

  if (kind === "owner") return NextResponse.next();

  // Ospite: solo con il database demo configurato, e solo le azioni che non costano nulla.
  if (kind === "demo" && demoEnabled()) {
    if (demoCanRequest(req.method, pathname)) return NextResponse.next();
    return NextResponse.json({ error: DEMO_BLOCKED_MESSAGE }, { status: 403 });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { cookies } from "next/headers";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_DAYS, sessionSecret } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  const secret = sessionSecret();
  if (!expected || !secret) return fail("APP_PASSWORD e SESSION_SECRET (min. 16 caratteri) vanno impostate", 503);
  const body = z.object({ password: z.string() }).safeParse(await req.json().catch(() => null));
  if (!body.success || !(await checkPassword(body.data.password, expected))) {
    await new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
    return fail("Password errata", 401);
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return ok({ ok: true });
}

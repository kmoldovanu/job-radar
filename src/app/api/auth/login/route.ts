import { cookies } from "next/headers";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import {
  checkPassword, createDemoToken, createSessionToken, DEMO_SESSION_DAYS, SESSION_COOKIE, SESSION_DAYS, sessionSecret,
} from "@/lib/auth";
import { demoEnabled, demoPassword } from "@/lib/demo";
import { seedDemo } from "@/lib/demo-seed";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  const secret = sessionSecret();
  if (!expected || !secret) return fail("APP_PASSWORD e SESSION_SECRET (min. 16 caratteri) vanno impostate", 503);
  const body = z.object({ password: z.string() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Password errata", 401);
  const isOwner = await checkPassword(body.data.password, expected);
  // La tua password ha sempre la precedenza: la demo entra solo se non è la tua.
  const isDemo = !isOwner && demoEnabled() && (await checkPassword(body.data.password, demoPassword()));
  if (!isOwner && !isDemo) {
    await new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
    return fail("Password errata", 401);
  }
  if (isDemo) await seedDemo({ onlyIfEmpty: true });
  (await cookies()).set(SESSION_COOKIE, isDemo ? await createDemoToken(secret) : await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: (isDemo ? DEMO_SESSION_DAYS : SESSION_DAYS) * 86400,
  });
  return ok({ ok: true });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authConfigured,
  createSession,
  passwordConfigured,
  safeEqual,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  verifySession,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether auth is switched on and whether the caller is signed in. */
export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value).catch(() => null);
  return NextResponse.json({
    enabled: authConfigured() && passwordConfigured(),
    passwordConfigured: passwordConfigured(),
    signedIn: Boolean(session),
    via: session?.via ?? null,
  });
}

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "AUTH_SECRET is not configured on the server, so sessions cannot be signed." },
      { status: 500 },
    );
  }
  if (!passwordConfigured()) {
    return NextResponse.json(
      { error: "No APP_PASSWORD is set, so password login is disabled." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A password is required." }, { status: 422 });
  }

  if (!safeEqual(parsed.data.password, process.env.APP_PASSWORD!)) {
    // Deliberately vague: a precise message would help someone guessing.
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }

  const response = NextResponse.json({ signedIn: true });
  response.cookies.set(SESSION_COOKIE, await createSession({ via: "password" }), SESSION_COOKIE_OPTIONS);
  return response;
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ signedIn: false });
  response.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

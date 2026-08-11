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
import { needsFirstAccount, userCount, verifyCredentials } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign in, sign out, and report the state of both.
 *
 * Two ways in, and they are not equivalent:
 *
 *   Accounts    — an email and a password, one record per person. The way in.
 *   APP_PASSWORD — a single shared secret in the environment. It predates
 *                  accounts and still works where it is set, so an existing
 *                  install does not lock its owner out on deploy, but nothing
 *                  steers anyone towards it.
 */

/** Reports what kind of sign-in this deployment offers, and who you are. */
export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value).catch(() => null);

  /*
   * `needsFirstAccount` reads storage strictly, so an outage raises rather
   * than answering "unclaimed" — which the sign-up page would act on by
   * offering the store to whoever happened to reload.
   */
  let setupRequired = false;
  let accounts = 0;
  try {
    setupRequired = await needsFirstAccount();
    accounts = await userCount();
  } catch {
    setupRequired = false;
  }

  return NextResponse.json({
    enabled: authConfigured(),
    setupRequired,
    accounts,
    passwordConfigured: passwordConfigured(),
    signedIn: Boolean(session),
    via: session?.via ?? null,
    email: session?.email ?? null,
  });
}

const schema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "AUTH_SECRET is not configured on the server, so sessions cannot be signed." },
      { status: 500 },
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
    return NextResponse.json({ error: "An email and password are required." }, { status: 422 });
  }

  const { email, password } = parsed.data;

  if (email) {
    const user = await verifyCredentials(email, password);
    if (!user) {
      // One message for "no such account" and for "wrong password". Telling
      // them apart would confirm which addresses have accounts here.
      return NextResponse.json({ error: "That email and password do not match." }, { status: 401 });
    }

    const response = NextResponse.json({
      signedIn: true,
      user: { email: user.email, name: user.name ?? null, owner: user.owner },
    });
    response.cookies.set(
      SESSION_COOKIE,
      await createSession({ via: "password", userId: user.id, email: user.email }),
      SESSION_COOKIE_OPTIONS,
    );
    return response;
  }

  // No email: the legacy shared-password path, only where it is configured.
  if (!passwordConfigured()) {
    return NextResponse.json(
      { error: "Enter the email and password for your account." },
      { status: 400 },
    );
  }

  if (!safeEqual(password, process.env.APP_PASSWORD!)) {
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

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authConfigured,
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  verifySession,
} from "@/lib/auth/session";
import { createUser, DuplicateEmailError, needsFirstAccount } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates an account.
 *
 * Open only until the deployment has an owner. The first request through here
 * claims it; every later one has to come from someone already signed in.
 *
 * The reason is that this is not a marketplace — every account sees the same
 * connected store, its full order history and its customers. Leaving
 * registration open would mean anyone who found the URL could read all of it.
 * Adding a colleague is therefore something you do from inside, not something
 * a stranger does from outside.
 */

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    // Length is the control that matters and the only one that does not push
    // people towards "Passw0rd!". PBKDF2 at 210k iterations covers the rest.
    .min(10, "Use at least 10 characters."),
  name: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json(
      {
        error: "This deployment cannot create accounts yet.",
        hint: "AUTH_SECRET is not set, so sessions cannot be signed. Generate one with `openssl rand -hex 32`, set it on the host, and redeploy.",
      },
      { status: 503 },
    );
  }

  let unclaimed: boolean;
  try {
    unclaimed = await needsFirstAccount();
  } catch {
    // Storage is unreadable. Refusing is the only safe answer: treating this as
    // "unclaimed" would hand the store to whoever asked during the outage.
    return NextResponse.json(
      { error: "The account store is unreachable, so registration is closed right now." },
      { status: 503 },
    );
  }

  if (!unclaimed) {
    const jar = await cookies();
    const session = await verifySession(jar.get(SESSION_COOKIE)?.value).catch(() => null);
    if (!session) {
      return NextResponse.json(
        {
          error: "Registration is closed on this deployment.",
          hint: "Ask whoever set it up to add an account for you from Settings → Team.",
        },
        { status: 403 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 422 });
  }

  const { email, password, name } = parsed.data;

  let user;
  try {
    user = await createUser(email, password, name);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  const response = NextResponse.json(
    { user: { email: user.email, name: user.name ?? null, owner: user.owner } },
    { status: 201 },
  );

  /*
   * Sign in the first account immediately — they just proved they control the
   * deployment by being first, and bouncing them to a login form to retype
   * what they typed a second ago adds nothing.
   *
   * An account created by an existing user does not take over that user's
   * session; they stay who they are.
   */
  if (user.owner) {
    response.cookies.set(
      SESSION_COOKIE,
      await createSession({ via: "password", userId: user.id, email: user.email }),
      SESSION_COOKIE_OPTIONS,
    );
  }

  return response;
}

"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Sign in and sign up, which are the same form with a different verb.
 *
 * Both talk to Supabase directly rather than posting to this app. The SDK owns
 * the tokens and their refresh; routing that through our own endpoint would
 * mean a second implementation of session handling that has to stay in step
 * with the first.
 */

/** Mirrors Supabase's own default, so the error arrives before the round trip. */
const MIN_PASSWORD = 6;

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [checkInbox, setCheckInbox] = useState(false);

  const signingUp = mode === "sign-up";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      if (signingUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
        });
        if (signUpError) throw signUpError;

        /*
         * With email confirmation switched on, Supabase returns a user but no
         * session — nothing has been verified yet. Announcing "you're in" and
         * bouncing them to a dashboard that immediately rejects them is the
         * worst version of this, so the two cases are told apart.
         */
        if (!data.session) {
          setCheckInbox(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  const withGoogle = async () => {
    setPending(true);
    setError(null);
    try {
      const { error: oauthError } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        // The code lands on the server, which is the only place cookies can be
        // written HttpOnly.
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Google.");
      setPending(false);
    }
  };

  if (checkInbox) {
    return (
      <Alert>
        <Mail />
        <AlertTitle>Confirm your email</AlertTitle>
        <AlertDescription>
          We sent a link to <strong>{email}</strong>. Open it to finish creating your account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={withGoogle}
        disabled={pending}
      >
        <GoogleMark />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[11px] text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signingUp ? "new-password" : "current-password"}
            required
          />
          {signingUp ? (
            <p className="text-[11px] text-muted-foreground">
              At least {MIN_PASSWORD} characters.
            </p>
          ) : null}
        </div>

        {error ? (
          <Alert>
            <AlertTitle>
              {signingUp ? "Could not create the account" : "Could not sign in"}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          className="w-full gap-1.5"
          disabled={pending || !email || password.length < (signingUp ? MIN_PASSWORD : 1)}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {signingUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {signingUp ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="underline underline-offset-2 hover:text-foreground">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * `next` arrives in the query string, so it is attacker-controllable. Only a
 * path is accepted: an absolute URL would turn sign-in into an open redirect,
 * which is a credible phishing primitive precisely because the link genuinely
 * does start at this site.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/** Google's mark, inline so the button does not wait on a network request. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

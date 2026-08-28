"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Mirrors Supabase's own default, so the error arrives before the round trip. */
const MIN_PASSWORD = 6;

/**
 * Sets a new password for whoever clicked a recovery link to get here.
 *
 * There is no "enter your current password" step: getting here at all
 * required clicking a one-time link sent to the account's own inbox, which
 * is already the proof of ownership a password-change form would otherwise
 * exist to collect.
 *
 * ─── Why this listens rather than just checking once ───────────────────────
 *
 * A recovery link's tokens arrive in the URL *hash*
 * (#access_token=...&type=recovery), not a query string — the one piece of a
 * URL a server can never see, since browsers never send it in the request.
 * There is no server-side exchange for this the way Google sign-in has one;
 * the Supabase client itself parses the hash after it loads on whatever page
 * `redirectTo` pointed at (see forgot-password-form.tsx) and only then fires
 * `PASSWORD_RECOVERY`. That parsing happens asynchronously, after this
 * component has already mounted, so a single `getSession()` call on mount
 * can easily run before it and see nothing yet. Listening for the event
 * (with an initial check alongside it, in case it already fired) is what
 * makes this correct instead of racy.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let settled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        settled = true;
        setReady(true);
      }
    });

    // Covers the case where the hash was already processed (and the event
    // already fired) before this listener was attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setReady(true);
      }
    });

    // Nothing arrived: either there was no recovery hash at all (a direct
    // visit) or Supabase rejected an expired/already-used one. Either way,
    // it isn't going to become ready by waiting longer.
    const timeout = setTimeout(() => {
      if (!settled) setReady(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });
      if (updateError) throw updateError;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  if (ready === null) {
    return <p className="text-sm text-muted-foreground">Checking your link…</p>;
  }

  if (!ready) {
    return (
      <Alert>
        <AlertTitle>This link has expired</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Reset links are one-time and expire after a while. Request a new one.</p>
          <Link
            href="/forgot-password"
            className="inline-block text-xs underline underline-offset-2"
          >
            Send a new link
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-[11px] text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      {error ? (
        <Alert>
          <AlertTitle>Could not set the new password</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        className="w-full gap-1.5"
        disabled={pending || password.length < MIN_PASSWORD || !confirm}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Set new password
      </Button>
    </form>
  );
}

"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";

const MIN_PASSWORD = 6;

/**
 * Changing a password while already signed in.
 *
 * Verified by re-entering the current one rather than trusting the open
 * session alone — a session left open on a shared device should not be
 * enough on its own to lock the real owner out. The one exception is an
 * account that only ever signed in with Google: it has no password to
 * verify, so setting one here is additive (it gives the account an email
 * sign-in path it did not have) rather than a change.
 */
export function ChangePasswordCard() {
  const [email, setEmail] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getUser();
    setEmail(data.user?.email ?? null);
    setHasPassword(Boolean(data.user?.identities?.some((i) => i.provider === "email")));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (next !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      if (hasPassword) {
        if (!email) throw new Error("Could not confirm your account email.");
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (verifyError) throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) throw updateError;

      toast.success(hasPassword ? "Password changed." : "Password set.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setHasPassword(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4" />
          Password
        </CardTitle>
        <CardDescription className="text-xs">
          {hasPassword === false
            ? "This account signed in with Google and has no password yet. Set one to also sign in with email."
            : "Change the password used to sign in."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasPassword === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {hasPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">At least {MIN_PASSWORD} characters.</p>

            {error ? (
              <Alert>
                <AlertTitle>Could not update the password</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={
                pending ||
                next.length < MIN_PASSWORD ||
                !confirm ||
                (hasPassword ? !current : false)
              }
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {hasPassword ? "Change password" : "Set password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

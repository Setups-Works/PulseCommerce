"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Label, TextField } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/client";

/**
 * Staff sign-in.
 *
 * Password only, and deliberately no Google button: the admin panel is for a
 * handful of internal accounts, and an OAuth provider on it means anyone with
 * a Google account can reach the door and be told "not staff" — which is a
 * user-enumeration surface for no convenience gain. Customers sign in at
 * /auth/sign-in, where Google is offered.
 *
 * The redirect after success is `router.refresh()` then `push`, in that order.
 * The proxy has to re-evaluate with the new cookie before the destination is
 * requested, or the push lands on a cached signed-out shell and bounces
 * straight back here.
 */
export function AdminLoginForm({
  nextPath,
  notStaff = false,
}: {
  nextPath: string;
  notStaff?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Supabase distinguishes these; the UI deliberately does not. Telling an
      // attacker which half of the pair was wrong is free reconnaissance.
      setError("That email and password did not match an account.");
      setPending(false);
      return;
    }

    router.refresh();
    router.push(nextPath);
  }

  return (
    <Card className="w-full max-w-sm p-7">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FontAwesomeIcon icon={faBolt} className="w-3.5" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight">PulseCommerce</p>
          <p className="text-xs text-muted">Admin panel</p>
        </div>
      </div>

      {notStaff ? (
        <Alert status="warning" className="mt-5">
          <Alert.Description className="text-sm">
            This account is signed in, but it is not a staff account.{" "}
            <Link href="/dashboard" className="font-medium underline underline-offset-4">
              Open the product instead
            </Link>
            , or sign in with a staff account below.
          </Alert.Description>
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <TextField name="email" type="email" isRequired value={email} onChange={setEmail}>
          <Label>Email</Label>
          <Input autoComplete="email" />
        </TextField>

        <TextField name="password" type="password" isRequired value={password} onChange={setPassword}>
          <Label>Password</Label>
          <Input autoComplete="current-password" />
        </TextField>

        {error ? (
          <Alert status="danger">
            <Alert.Description className="text-sm">{error}</Alert.Description>
          </Alert>
        ) : null}

        <Button type="submit" variant="primary" fullWidth isDisabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Not staff?{" "}
        <Link href="/auth/sign-in" className="font-medium text-foreground underline underline-offset-4">
          Sign in to the product
        </Link>
      </p>
    </Card>
  );
}

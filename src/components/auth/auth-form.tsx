"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBolt, faCheck, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Field } from "@/components/ui-hero/field";
import { createClient } from "@/lib/supabase/client";

/**
 * Customer sign-in and sign-up, on HeroUI.
 *
 * This is the first signed-in surface a customer meets, so it uses the same
 * component library as the product and the admin panel. Magic UI and shadcn
 * stop at the marketing pages.
 *
 * Three ways in, in the order most people use them:
 *
 *   1. Google. One click, no password to store or reset.
 *   2. Email and password.
 *   3. A magic link, when the password is forgotten.
 *
 * Every path lands on /auth/callback, which exchanges the code and forwards to
 * onboarding. Sign-up and sign-in share this component because the forms are
 * identical apart from one label and one call — two files would drift.
 */

export type AuthMode = "sign-in" | "sign-up";

const COPY: Record<
  AuthMode,
  { title: string; subtitle: string; action: string; swap: string; swapHref: string; swapLabel: string }
> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to see who is buying, and who has stopped.",
    action: "Sign in",
    swap: "New to PulseCommerce?",
    swapHref: "/auth/sign-up",
    swapLabel: "Create an account",
  },
  "sign-up": {
    title: "Start with your own data",
    subtitle: "Connect a WooCommerce store and see your real customers in minutes.",
    action: "Create account",
    swap: "Already have an account?",
    swapHref: "/auth/sign-in",
    swapLabel: "Sign in",
  },
};

const REASSURANCES = [
  "Read-only access to your store",
  "Fourteen days free, no card",
  "Disconnecting wipes every cached order",
];

export function AuthForm({ mode, initialError }: { mode: AuthMode; initialError?: string }) {
  const router = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [pending, setPending] = React.useState<null | "password" | "google" | "magic">(null);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [notice, setNotice] = React.useState<string | null>(null);

  /** Absolute, because Supabase redirects the browser back to it by URL. */
  const callbackUrl = React.useCallback(() => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", "/onboarding");
    return url.toString();
  }, []);

  async function withGoogle() {
    setPending("google");
    setError(null);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser has already navigated away, so reaching here at
    // all means it failed.
    if (oauthError) {
      setError(
        "Google sign-in is not available. Enable the Google provider in your Supabase project, or use email instead.",
      );
      setPending(null);
    }
  }

  async function withPassword(event: React.FormEvent) {
    event.preventDefault();
    setPending("password");
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl(),
          data: { full_name: fullName.trim() || null },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setPending(null);
        return;
      }

      // With email confirmation switched on, Supabase returns a user but no
      // session. Sending them to onboarding would bounce straight back.
      if (!data.session) {
        setNotice(`Check ${email.trim()} for a link to confirm your account.`);
        setPending(null);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Not distinguishing "no such account" from "wrong password" on
        // purpose: the difference is free reconnaissance for an attacker.
        setError("That email and password did not match an account.");
        setPending(null);
        return;
      }
    }

    router.refresh();
    router.push("/onboarding");
  }

  async function withMagicLink() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setPending("magic");
    setError(null);

    const { error: otpError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });

    if (otpError) setError(otpError.message);
    else setNotice(`Check ${email.trim()} for a sign-in link.`);
    setPending(null);
  }

  return (
    <Card className="w-full max-w-sm p-7">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FontAwesomeIcon icon={faBolt} className="w-3.5" />
        </span>
        <span className="text-sm font-semibold tracking-tight">PulseCommerce</span>
      </Link>

      <div className="mt-6">
        <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>
      </div>

      <Button
        variant="outline"
        fullWidth
        className="mt-6"
        isDisabled={pending !== null}
        onPress={withGoogle}
      >
        {pending === "google" ? <Spinner size="sm" /> : <FontAwesomeIcon icon={faGoogle} className="w-4" />}
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={withPassword} className="flex flex-col gap-4">
        {mode === "sign-up" ? (
          <Field
            label="Name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={fullName}
            onChange={setFullName}
          />
        ) : null}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          isRequired
          placeholder="you@yourstore.com"
          value={email}
          onChange={setEmail}
        />

        <div className="flex flex-col gap-1.5">
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            isRequired
            value={password}
            onChange={setPassword}
            description={mode === "sign-up" ? "At least eight characters." : undefined}
          />
          {mode === "sign-in" ? (
            <button
              type="button"
              onClick={withMagicLink}
              disabled={pending !== null}
              className="self-start text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              Email me a link instead
            </button>
          ) : null}
        </div>

        {error ? (
          <Alert status="danger">
            <Alert.Description className="text-sm">{error}</Alert.Description>
          </Alert>
        ) : null}

        {notice ? (
          <Alert status="accent">
            <Alert.Indicator>
              <FontAwesomeIcon icon={faEnvelope} className="w-3.5" />
            </Alert.Indicator>
            <Alert.Description className="text-sm">{notice}</Alert.Description>
          </Alert>
        ) : null}

        <Button type="submit" variant="primary" fullWidth isDisabled={pending !== null}>
          {pending === "password" ? <Spinner size="sm" /> : null}
          {copy.action}
          {pending !== "password" ? <FontAwesomeIcon icon={faArrowRight} className="w-3.5" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {copy.swap}{" "}
        <Link href={copy.swapHref} className="font-medium text-foreground underline underline-offset-4">
          {copy.swapLabel}
        </Link>
      </p>

      {mode === "sign-up" ? (
        <ul className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
          {REASSURANCES.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-muted">
              <FontAwesomeIcon icon={faCheck} className="w-3 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

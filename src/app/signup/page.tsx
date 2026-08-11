"use client";

import { Activity, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

/** Mirrors the server rule in /api/auth/register. */
const MIN_PASSWORD = 10;

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/settings";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [closed, setClosed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((state: { setupRequired?: boolean }) => {
        if (!cancelled) setClosed(!state.setupRequired);
      })
      .catch(() => {
        if (!cancelled) setClosed(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.hint ? `${json.error} ${json.hint}` : json.error ?? "Could not create the account.");
      // The first account is signed in by the server, so go straight on.
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-5" strokeWidth={2.5} />
        </span>
        <span className="text-base font-semibold tracking-tight">PulseCommerce</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Create your account</CardTitle>
          <CardDescription className="text-xs">
            This is the first account on this deployment, so it becomes the owner. You will connect
            WooCommerce and WhatsApp next.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {closed ? (
            <Alert>
              <ShieldCheck />
              <AlertTitle>Registration is closed</AlertTitle>
              <AlertDescription>
                This deployment already has an owner. Ask them to add an account for you, or{" "}
                <Link href="/login" className="underline underline-offset-2">
                  sign in
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={register} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Optional"
              />
            </div>

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
                autoComplete="new-password"
                required
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                At least {MIN_PASSWORD} characters. Length matters more than symbols — a short
                phrase you will remember beats something you have to write down.
              </p>
            </div>

            {error ? (
              <Alert>
                <AlertTitle>Could not create the account</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="w-full gap-1.5"
              disabled={pending || closed === true || !email || password.length < MIN_PASSWORD}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Already set up?{" "}
        <Link href="/login" className="hover:text-foreground">
          Sign in
        </Link>
      </p>
    </main>
  );
}

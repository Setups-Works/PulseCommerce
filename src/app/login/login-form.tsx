"use client";

import { Activity, ArrowRight, Loader2, Lock, Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [password, setPassword] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sign in failed.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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
          <CardTitle className="text-base">Sign in</CardTitle>
          <CardDescription className="text-xs">
            This dashboard is protected because a password is configured on the server.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={signIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>

            {error ? (
              <Alert>
                <Lock />
                <AlertTitle>Could not sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full gap-1.5" disabled={pending || !password}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Sign in
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Completing the WooCommerce authorization proves store access, so it
              signs you in as well as connecting the store. */}
          <form action="/api/auth/woo/start" method="get" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="url">Authorize with your WooCommerce store</Label>
              <Input
                id="url"
                name="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://yourstore.com"
                autoComplete="url"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                You will approve read-only access inside your own WordPress admin. Requires this app to be served
                over HTTPS.
              </p>
            </div>
            <Button type="submit" variant="outline" className="w-full gap-1.5" disabled={storeUrl.length < 4}>
              <Store className="size-4" />
              Continue to WooCommerce
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Back to the overview
        </Link>
      </p>
    </main>
  );
}

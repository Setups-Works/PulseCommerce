"use client";

import { Check, Loader2, Terminal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The one screen `pulse login` sends a browser to.
 *
 * The code is shown large and alone at the top, on purpose: the whole point
 * of a device-authorization flow is that the person compares it against what
 * their own terminal printed before clicking anything, so a phished copy of
 * this page (with a different code baked in) doesn't get an approval it
 * shouldn't. Nothing else on the page can substitute for that comparison.
 */
export function CliLoginApproval({ userCode }: { userCode: string }) {
  const [outcome, setOutcome] = useState<"approved" | "denied" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);

  const respond = async (action: "approve" | "deny") => {
    setPending(action);
    setError(null);
    try {
      const res = await fetch("/api/cli/auth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not record that.");
      setOutcome(action === "approve" ? "approved" : "denied");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record that.");
    } finally {
      setPending(null);
    }
  };

  if (outcome === "approved") {
    return (
      <StatusCard
        icon={<Check className="size-5 text-primary" />}
        title="Signed in"
        body="Your terminal should pick this up in a few seconds. You can close this tab."
      />
    );
  }
  if (outcome === "denied") {
    return (
      <StatusCard
        icon={<X className="size-5 text-muted-foreground" />}
        title="Denied"
        body="That login was refused. If this wasn't you, nothing further happens — the code is now unusable."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="size-4" />
          Sign in to the CLI?
        </CardTitle>
        <CardDescription className="text-xs">
          A terminal is asking to sign in as you, with read and write access — the same as a key
          created in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/40 py-4 text-center">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Does your terminal show this code?
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tracking-widest">{userCode}</p>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1 gap-1.5"
            onClick={() => respond("approve")}
            disabled={pending !== null}
          >
            {pending === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => respond("deny")}
            disabled={pending !== null}
          >
            Deny
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          If you did not run <code className="rounded bg-muted px-1 py-0.5 font-mono">pulse login</code>{" "}
          yourself, choose Deny.
        </p>
      </CardContent>
    </Card>
  );
}

function StatusCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full border bg-muted/50">
          {icon}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

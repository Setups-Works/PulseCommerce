"use client";

import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKey {
  id: string;
  name: string;
  display: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/**
 * Issuing and revoking the keys that let other code call this API.
 *
 * The one interaction worth designing carefully is creation: the key is
 * returned once and never again, because only its digest is stored. If someone
 * closes this panel without copying it, it is gone. So a new key is shown in a
 * block that does not disappear on its own, with a copy button and an explicit
 * acknowledgement to dismiss it.
 */
export function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      if (res.status === 401) {
        setSignedOut(true);
        setKeys([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load keys.");
      setSignedOut(false);
      setKeys(json.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load keys.");
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes: write ? ["read", "write"] : ["read"] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create the key.");

      setIssued(json.key);
      setName("");
      setWrite(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the key.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not revoke the key.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke the key.");
    }
  };

  const copy = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active = (keys ?? []).filter((k) => !k.revokedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" />
          API keys
        </CardTitle>
        <CardDescription className="text-xs">
          For calling this API from your own code. See the{" "}
          <Link href="/api-docs" className="underline underline-offset-2">
            reference
          </Link>{" "}
          for what you can do with one.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {signedOut ? (
          <Alert>
            <AlertTitle>Sign in to manage keys</AlertTitle>
            <AlertDescription>
              Keys belong to an account, so there has to be one signed in.{" "}
              <Link href="/login?next=/settings" className="underline underline-offset-2">
                Sign in
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        {issued ? (
          <Alert>
            <AlertTitle>Copy this key now</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-xs">
                This is the only time it will be shown. Only a digest is stored, so it cannot be
                recovered later.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">
                  {issued}
                </code>
                <Button type="button" size="sm" variant="outline" onClick={copy} className="gap-1.5">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIssued(null)}>
                I have saved it
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert>
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!signedOut ? (
          <form onSubmit={create} className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="key-name" className="text-xs">
                Name
              </Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Reporting cron"
                maxLength={60}
              />
              <p className="text-[11px] text-muted-foreground">
                How you will recognise it later, when deciding whether it is still needed.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="key-write"
                checked={write}
                onCheckedChange={(v) => setWrite(v === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="key-write" className="text-xs font-normal">
                  Allow write access
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Sending WhatsApp messages and creating coupons. Leave off for a key that can only
                  read.
                </p>
              </div>
            </div>

            <Button type="submit" size="sm" className="gap-1.5" disabled={creating || !name.trim()}>
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Create key
            </Button>
          </form>
        ) : null}

        {keys === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-xs text-muted-foreground">No keys yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {active.map((key) => (
              <li key={key.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-xs font-medium">{key.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{key.display}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-[10px]">
                      {scope}
                    </Badge>
                  ))}
                </div>

                <p className="hidden w-28 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
                  {/* Recorded at most hourly, so "never" can mean "not in the last hour". */}
                  {key.lastUsedAt ? `Used ${relative(key.lastUsedAt)}` : "Never used"}
                </p>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  onClick={() => revoke(key.id)}
                  aria-label={`Revoke ${key.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function relative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

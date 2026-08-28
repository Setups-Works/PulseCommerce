"use client";

import { CheckCircle2, Loader2, ShoppingCart, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CheckoutRow {
  orderId: number;
  status: "messaged" | "skipped";
  skipReason: string | null;
  messagedAt: string | null;
  createdAt: string;
}

interface State {
  enabled: boolean;
  storeUrl: string;
  items: CheckoutRow[];
}

/**
 * Abandoned checkout recovery.
 *
 * WooCommerce creates a real order the instant someone starts checkout,
 * before payment finishes — that's the signal this reads, live, every five
 * minutes, for any order left pending, on-hold or failed for 30 minutes.
 * There is nothing to author here, unlike a flow or a campaign: the only
 * input is the switch. What happened to each order is either a WhatsApp
 * reminder sent, or a reason it wasn't — no phone number is ever shown,
 * matching the rest of this app.
 */
export default function AbandonedCheckoutsPage() {
  const [state, setState] = useState<State | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/abandoned-checkouts", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load abandoned checkouts.");
      setState(body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load abandoned checkouts.");
      setState({ enabled: false, storeUrl: "", items: [] });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const toggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      const res = await fetch("/api/whatsapp/abandoned-checkouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save that.");
      setState((current) => (current ? { ...current, enabled } : current));
      toast.success(enabled ? "Abandoned checkout recovery is on." : "Turned off.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShoppingCart className="size-5" />
          Abandoned checkouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A WhatsApp reminder for a checkout left pending, on-hold or failed for 30 minutes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Recover abandoned checkouts</CardTitle>
              <CardDescription className="text-xs">
                Checked every five minutes. Turning this on only ever looks at orders placed from
                this moment forward — nothing already pending gets messaged as a batch. Someone who
                completes payment, or who has already opted out, is never messaged either.
              </CardDescription>
            </div>
            {state ? (
              <Switch
                checked={state.enabled}
                disabled={toggling}
                onCheckedChange={toggle}
                aria-label="Recover abandoned checkouts"
              />
            ) : (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription className="text-xs">
            No phone number is shown here — only what happened to each order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : state.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Once a checkout is left pending for 30 minutes, it appears here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.items.map((item) => (
                  <TableRow key={item.orderId}>
                    <TableCell>
                      {state.storeUrl ? (
                        <a
                          href={`${state.storeUrl.replace(/\/+$/, "")}/wp-admin/post.php?post=${item.orderId}&action=edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          #{item.orderId}
                        </a>
                      ) : (
                        <span className="font-medium">#{item.orderId}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.status === "messaged" ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          Reminder sent
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <XCircle className="size-3.5 text-muted-foreground" />
                          {item.skipReason ?? "Skipped"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(item.messagedAt ?? item.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

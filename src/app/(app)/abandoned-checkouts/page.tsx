"use client";

import { CheckCircle2, Loader2, Percent, Send, ShoppingCart, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
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
 *
 * The header (title, description) comes from Topbar reading nav-items.ts —
 * every other app page works the same way, so this one starts straight into
 * its own content rather than repeating a heading Topbar already renders.
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

  const stats = useMemo(() => {
    const items = state?.items ?? [];
    const messaged = items.filter((i) => i.status === "messaged");
    const skipped = items.filter((i) => i.status === "skipped");
    const rate = items.length > 0 ? messaged.length / items.length : null;

    // Last 14 days of messaged reminders, oldest first — a shape, not a report;
    // the tile's own number carries the value, same convention as the
    // dashboard's own StatTiles.
    const days: string[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const byDay = new Map(days.map((d) => [d, 0]));
    for (const item of messaged) {
      const key = (item.messagedAt ?? item.createdAt).slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const trend = [...byDay.values()];

    return { messaged: messaged.length, skipped: skipped.length, rate, trend };
  }, [state]);

  return (
    <div className="space-y-6">
      <StatStrip>
        <StatTile
          label="Reminders sent"
          value={String(stats.messaged)}
          icon={Send}
          trend={stats.trend}
          hint="A WhatsApp reminder sent for an order left pending, on-hold or failed for 30 minutes."
        />
        <StatTile
          label="Skipped"
          value={String(stats.skipped)}
          icon={XCircle}
          hint="No phone number could be read, the number had opted out, or the WhatsApp session wasn't ready."
        />
        <StatTile
          label="Recovery rate"
          value={stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`}
          icon={Percent}
          hint="Reminders sent as a share of every eligible order seen so far."
        />
        <StatTile
          label="Tracked orders"
          value={String(stats.messaged + stats.skipped)}
          icon={ShoppingCart}
          footer="Since recovery was last turned on"
        />
      </StatStrip>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Recover abandoned checkouts
                {state ? (
                  <Badge
                    variant={state.enabled ? "default" : "outline"}
                    className="text-[10px] font-medium uppercase tracking-wide"
                  >
                    {state.enabled ? "Live" : "Off"}
                  </Badge>
                ) : null}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
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
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
              <ShoppingCart className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Nothing yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Once a checkout is left pending for 30 minutes after recovery is turned on, it
                appears here.
              </p>
            </div>
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

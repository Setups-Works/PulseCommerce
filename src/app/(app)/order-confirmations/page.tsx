"use client";

import { CheckCircle2, Loader2, PackageCheck, Percent, Send, XCircle } from "lucide-react";
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

interface ConfirmationRow {
  orderId: number;
  status: "sent" | "skipped";
  skipReason: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface State {
  enabled: boolean;
  storeUrl: string;
  items: ConfirmationRow[];
}

/**
 * WhatsApp order confirmations.
 *
 * Unlike abandoned-checkout recovery, turning this on does real work right
 * away: it registers a genuine order.created webhook on the merchant's own
 * WooCommerce store, so a customer's WhatsApp thank-you arrives within
 * seconds of the order, not on the next sync tick. Turning it off removes
 * that webhook. No phone number is ever shown here, matching the rest of
 * this app — only what happened to each order.
 *
 * The header (title, description) comes from Topbar reading nav-items.ts.
 */
export default function OrderConfirmationsPage() {
  const [state, setState] = useState<State | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/order-confirmations", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load order confirmations.");
      setState(body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load order confirmations.");
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
      const res = await fetch("/api/whatsapp/order-confirmations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save that.");
      setState((current) => (current ? { ...current, enabled } : current));
      if (body.warning) toast.warning(body.warning);
      toast.success(enabled ? "Order confirmations are live." : "Turned off.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setToggling(false);
    }
  };

  const stats = useMemo(() => {
    const items = state?.items ?? [];
    const sent = items.filter((i) => i.status === "sent");
    const skipped = items.filter((i) => i.status === "skipped");
    const rate = items.length > 0 ? sent.length / items.length : null;

    const days: string[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const byDay = new Map(days.map((d) => [d, 0]));
    for (const item of sent) {
      const key = (item.sentAt ?? item.createdAt).slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const trend = [...byDay.values()];

    return { sent: sent.length, skipped: skipped.length, rate, trend };
  }, [state]);

  return (
    <div className="space-y-6">
      <StatStrip>
        <StatTile
          label="Confirmations sent"
          value={String(stats.sent)}
          icon={Send}
          trend={stats.trend}
          hint="A WhatsApp thank-you sent within seconds of a new order, with the ordered product's photo when one is available."
        />
        <StatTile
          label="Skipped"
          value={String(stats.skipped)}
          icon={XCircle}
          hint="No phone number could be read, the number had opted out, the monthly limit was reached, or the WhatsApp session wasn't ready."
        />
        <StatTile
          label="Delivery rate"
          value={stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`}
          icon={Percent}
          hint="Confirmations sent as a share of every order the webhook has seen so far."
        />
        <StatTile
          label="Tracked orders"
          value={String(stats.sent + stats.skipped)}
          icon={PackageCheck}
          footer="Since confirmations were last turned on"
        />
      </StatStrip>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Send a WhatsApp thank-you on every order
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
                Turning this on registers a real-time webhook on your WooCommerce store, so a
                customer&apos;s thank-you — order number, a photo of what they bought, and a note —
                arrives within seconds, not on the next sync. Turning it off removes that webhook.
                This app must be reachable over a public HTTPS address for the webhook to register;
                if it isn&apos;t yet, turning this on will say so.
              </CardDescription>
            </div>
            {state ? (
              <Switch
                checked={state.enabled}
                disabled={toggling}
                onCheckedChange={toggle}
                aria-label="Send a WhatsApp thank-you on every order"
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
              <PackageCheck className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Nothing yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Once order confirmations are turned on, the next new order placed on your store
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
                      {item.status === "sent" ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          Thank-you sent
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <XCircle className="size-3.5 text-muted-foreground" />
                          {item.skipReason ?? "Skipped"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(item.sentAt ?? item.createdAt).toLocaleString()}
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

"use client";

import { CreditCard, Download, Loader2, MessageCircle, MessagesSquare } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { StatStrip, StatTile } from "@/components/dashboard/stat-tile";
import { useBilling, type BillingStatus } from "@/components/providers/billing-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invoice {
  id: string;
  plan: "go" | "plus";
  amountPaise: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  paidAt: string;
  downloadUrl: string;
}

const PLANS = [
  { id: "go" as const, label: "Go", priceLabel: "₹3,999/mo", detail: "10,000 WhatsApp messages/month" },
  { id: "plus" as const, label: "Plus", priceLabel: "₹5,999/mo", detail: "Unlimited WhatsApp messages" },
];

const STATUS_LABEL: Record<BillingStatus["subscriptionStatus"], string> = {
  none: "No plan",
  created: "Awaiting mandate",
  authenticated: "Free trial",
  active: "Active",
  past_due: "Payment failed — grace period",
  halted: "Halted",
  cancelled: "Cancelled",
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Plan, usage this month, and invoice history.
 *
 * The only payment UI here is a button that opens Razorpay's own hosted
 * Checkout — the UPI mandate itself is collected there, never in a form this
 * app builds. See src/lib/billing/razorpay.ts for why.
 */
export function BillingCard() {
  const { status, refresh: refreshStatus } = useBilling();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [subscribing, setSubscribing] = useState<"go" | "plus" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/invoices", { cache: "no-store" });
      if (res.ok) setInvoices((await res.json()).invoices);
    } catch {
      setError("Could not load invoice history.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInvoices();
  }, [loadInvoices]);

  const subscribe = async (plan: "go" | "plus") => {
    setSubscribing(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start checkout.");

      if (!checkoutReady || !window.Razorpay) {
        throw new Error("Payment widget is still loading. Try again in a moment.");
      }

      new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: json.subscriptionId,
        // Restricts the widget to UPI — this app only supports UPI Autopay,
        // not cards or netbanking, so there's no reason to offer them.
        config: { display: { blocks: { upi: { instruments: [{ method: "upi" }] } }, sequence: ["block.upi"], preferences: { show_default_blocks: false } } },
        handler: () => {
          toast.success(
            json.trialDays > 0
              ? `Your ${json.trialDays}-day free trial has started.`
              : "Mandate set up — this can take a minute to activate.",
          );
          refreshStatus();
          void loadInvoices();
        },
        modal: {
          // Checkout creates the subscription server-side before this popup
          // ever opens, so closing it without paying still leaves a "created"
          // record behind — nothing else ever runs to clean it up, since
          // Razorpay only sends a webhook once a mandate is actually
          // authorized. Revert it immediately rather than leave Settings
          // claiming a plan nothing was paid for.
          ondismiss: () => {
            void fetch("/api/billing/cancel", { method: "POST" }).finally(() => {
              refreshStatus();
            });
          },
        },
      }).open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setSubscribing(null);
    }
  };

  const usagePct =
    status?.usage.limit && status.usage.limit > 0
      ? Math.min(100, Math.round((status.usage.sent / status.usage.limit) * 100))
      : 0;

  return (
    <Card>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setCheckoutReady(true)}
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" />
          Billing
        </CardTitle>
        <CardDescription className="text-xs">
          Plan, usage this month, and past invoices.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <Alert>
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {status === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {status.legacyUnlimited
                      ? "Unlimited (grandfathered)"
                      : status.plan
                        ? PLANS.find((p) => p.id === status.plan)?.label
                        : "No plan"}
                  </p>
                  {!status.legacyUnlimited && status.plan ? (
                    <Badge
                      variant={
                        status.subscriptionStatus === "active" || status.subscriptionStatus === "authenticated"
                          ? "default"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {STATUS_LABEL[status.subscriptionStatus]}
                    </Badge>
                  ) : null}
                </div>
                {status.subscriptionStatus === "authenticated" && status.trialEndsAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Trial ends {new Date(status.trialEndsAt).toLocaleDateString()}
                  </p>
                ) : status.currentPeriodEnd && !status.legacyUnlimited ? (
                  <p className="text-[11px] text-muted-foreground">
                    Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              {/*
               * The balance, not just a sent count: "how many can I still
               * send" is the number that actually decides whether the next
               * campaign goes out, and burying it inside a sent/limit ratio
               * made someone do the subtraction themselves.
               */}
              <StatStrip className="border-0 py-0 sm:divide-x-0">
                <StatTile
                  label="Messages remaining"
                  value={
                    status.usage.limit === null
                      ? "Unlimited"
                      : Math.max(0, status.usage.limit - status.usage.sent).toLocaleString()
                  }
                  icon={MessagesSquare}
                  footer={status.usage.limit !== null ? "This calendar month" : undefined}
                />
                <StatTile
                  label="Sent this month"
                  value={status.usage.sent.toLocaleString()}
                  icon={MessageCircle}
                  footer={
                    status.usage.limit !== null ? `of ${status.usage.limit.toLocaleString()} on this plan` : undefined
                  }
                />
              </StatStrip>
              {status.usage.limit ? <Progress value={usagePct} /> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PLANS.map((plan) => {
                const isCurrent =
                  status.plan === plan.id &&
                  (status.subscriptionStatus === "active" || status.subscriptionStatus === "authenticated");
                return (
                  <div key={plan.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium">{plan.label}</p>
                      <p className="text-sm font-semibold">
                        {status.trialAvailable && !isCurrent ? `14 days free, then ${plan.priceLabel}` : plan.priceLabel}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{plan.detail}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={subscribing !== null || isCurrent}
                      onClick={() => subscribe(plan.id)}
                      className="w-full gap-1.5"
                    >
                      {subscribing === plan.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      {isCurrent
                        ? "Current plan"
                        : status.trialAvailable
                          ? "Start free trial"
                          : status.plan
                            ? "Switch to this plan"
                            : "Subscribe"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium">Invoices</p>
          {invoices === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-xs">
                      {new Date(invoice.paidAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{invoice.plan}</TableCell>
                    <TableCell className="text-xs">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: invoice.currency,
                      }).format(invoice.amountPaise / 100)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild type="button" size="icon" variant="ghost" className="size-7">
                        <a href={invoice.downloadUrl} download aria-label="Download invoice">
                          <Download className="size-3.5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

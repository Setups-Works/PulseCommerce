"use client";

import { CreditCard, Download, Loader2 } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

interface BillingStatus {
  plan: "go" | "plus" | null;
  subscriptionStatus: "none" | "created" | "active" | "past_due" | "halted" | "cancelled";
  currentPeriodEnd: string | null;
  legacyUnlimited: boolean;
  usage: { sent: number; limit: number | null };
}

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
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [subscribing, setSubscribing] = useState<"go" | "plus" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statusRes, invoicesRes] = await Promise.all([
        fetch("/api/billing/status", { cache: "no-store" }),
        fetch("/api/billing/invoices", { cache: "no-store" }),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (invoicesRes.ok) setInvoices((await invoicesRes.json()).invoices);
    } catch {
      setError("Could not load billing status.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
          toast.success("Mandate set up — this can take a minute to activate.");
          void load();
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
                      variant={status.subscriptionStatus === "active" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {STATUS_LABEL[status.subscriptionStatus]}
                    </Badge>
                  ) : null}
                </div>
                {status.currentPeriodEnd && !status.legacyUnlimited ? (
                  <p className="text-[11px] text-muted-foreground">
                    Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Messages sent this month</span>
                <span className="font-medium">
                  {status.usage.sent.toLocaleString()}
                  {status.usage.limit ? ` / ${status.usage.limit.toLocaleString()}` : " · Unlimited"}
                </span>
              </div>
              {status.usage.limit ? <Progress value={usagePct} /> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <div key={plan.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{plan.label}</p>
                    <p className="text-sm font-semibold">{plan.priceLabel}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{plan.detail}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={status.plan === plan.id && status.subscriptionStatus === "active" ? "outline" : "default"}
                    disabled={
                      subscribing !== null ||
                      (status.plan === plan.id && status.subscriptionStatus === "active")
                    }
                    onClick={() => subscribe(plan.id)}
                    className="w-full gap-1.5"
                  >
                    {subscribing === plan.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {status.plan === plan.id && status.subscriptionStatus === "active"
                      ? "Current plan"
                      : status.plan
                        ? "Switch to this plan"
                        : "Subscribe"}
                  </Button>
                </div>
              ))}
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

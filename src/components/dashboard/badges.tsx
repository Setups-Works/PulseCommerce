"use client";

import { Badge } from "@/components/ui/badge";
import type { RfmSegment, ValueTier } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

/**
 * Tier and segment badges. Each carries its own text, so the colour is a
 * reinforcement rather than the signal.
 */

const TIER_STYLES: Record<ValueTier, string> = {
  VIP: "border-transparent bg-[color-mix(in_oklab,var(--chart-7)_16%,transparent)] text-[var(--chart-7)]",
  High: "border-transparent bg-[color-mix(in_oklab,var(--chart-1)_16%,transparent)] text-[var(--chart-1)]",
  Mid: "border-transparent bg-[color-mix(in_oklab,var(--chart-3)_16%,transparent)] text-[var(--chart-3)]",
  Low: "border-transparent bg-muted text-muted-foreground",
  "One-time": "border-transparent bg-muted text-muted-foreground",
};

export function TierBadge({ tier, className }: { tier: ValueTier; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", TIER_STYLES[tier], className)}>
      {tier}
    </Badge>
  );
}

const SEGMENT_TONE: Record<RfmSegment, "good" | "neutral" | "watch" | "risk"> = {
  Champions: "good",
  Loyal: "good",
  "Potential Loyalist": "good",
  "New Customers": "neutral",
  Promising: "neutral",
  "Need Attention": "watch",
  "At Risk": "watch",
  "Cannot Lose Them": "risk",
  Hibernating: "watch",
  Lost: "risk",
};

const TONE_STYLES = {
  good: "border-transparent bg-[color-mix(in_oklab,var(--good)_14%,transparent)] text-[var(--good)]",
  neutral: "border-transparent bg-[color-mix(in_oklab,var(--chart-1)_14%,transparent)] text-[var(--chart-1)]",
  watch: "border-transparent bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[var(--warning)]",
  risk: "border-transparent bg-[color-mix(in_oklab,var(--critical)_14%,transparent)] text-[var(--critical)]",
} as const;

export function SegmentBadge({ segment, className }: { segment: RfmSegment; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", TONE_STYLES[SEGMENT_TONE[segment]], className)}>
      {segment}
    </Badge>
  );
}

const STATUS_TONE: Record<string, keyof typeof TONE_STYLES> = {
  completed: "good",
  processing: "neutral",
  "on-hold": "watch",
  pending: "watch",
  cancelled: "risk",
  refunded: "risk",
  failed: "risk",
};

export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", TONE_STYLES[STATUS_TONE[status] ?? "neutral"])}>
      {label}
    </Badge>
  );
}

export function AbcBadge({ abcClass }: { abcClass: "A" | "B" | "C" }) {
  const tone = abcClass === "A" ? "good" : abcClass === "B" ? "neutral" : "watch";
  return (
    <Badge variant="outline" className={cn("w-6 justify-center text-[10px] font-semibold", TONE_STYLES[tone])}>
      {abcClass}
    </Badge>
  );
}

/** Churn risk as a labelled band — never a bare colour swatch. */
export function RiskBadge({ risk }: { risk: number }) {
  const pct = Math.round(risk * 100);
  const tone = risk >= 0.75 ? "risk" : risk >= 0.5 ? "watch" : risk >= 0.25 ? "neutral" : "good";
  const label = risk >= 0.75 ? "High" : risk >= 0.5 ? "Elevated" : risk >= 0.25 ? "Moderate" : "Low";
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px]", TONE_STYLES[tone])}>
      {label}
      <span className="tabular opacity-70">{pct}%</span>
    </Badge>
  );
}

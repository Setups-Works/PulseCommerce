"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { Label } from "@heroui/react";
import { ListBox, ListBoxItem, Select, SelectPopover, SelectTrigger, SelectValue } from "@heroui/react";
import { Separator } from "@heroui/react";
import type { RfmSegment, ValueTier } from "@/lib/analytics/types";
import { EMPTY_AUDIENCE, type AudienceFilter } from "@/lib/audience";
import { cn } from "@/lib/utils";

const SEGMENTS: RfmSegment[] = [
  "Champions", "Loyal", "Potential Loyalist", "New Customers", "Promising",
  "Need Attention", "At Risk", "Cannot Lose Them", "Hibernating", "Lost",
];
const TIERS: ValueTier[] = ["VIP", "High", "Mid", "Low", "One-time"];

/** How many filters are doing something, for the collapsed summary. */
export function countActiveFilters(filter: AudienceFilter): number {
  let n = 0;
  if (filter.segments.length) n += 1;
  if (filter.tiers.length) n += 1;
  if (filter.recencyMin !== null || filter.recencyMax !== null) n += 1;
  if (filter.minSpend !== null) n += 1;
  if (filter.minOrders !== null) n += 1;
  if (filter.churnRiskMin !== null) n += 1;
  if (filter.countries.length) n += 1;
  if (filter.accountType !== "any") n += 1;
  if (filter.boughtProduct.trim()) n += 1;
  return n;
}

/**
 * Advanced filtering for the customer ledger.
 *
 * Shares the `AudienceFilter` shape with the campaign audience builder, so a
 * segment defined while exploring can be lifted straight into a campaign
 * without redefining it in a second vocabulary.
 */
export function CustomerFilters({
  filter,
  onChange,
  countries,
  matched,
  total,
}: {
  filter: AudienceFilter;
  onChange: (filter: AudienceFilter) => void;
  countries: string[];
  matched: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filter);

  const set = <K extends keyof AudienceFilter>(key: K, value: AudienceFilter[K]) =>
    onChange({ ...filter, [key]: value });

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Advanced filters
          {active > 0 ? (
            <Chip color="default" className="text-[10px]">
              {active} active
            </Chip>
          ) : null}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular">
            {matched.toLocaleString()} of {total.toLocaleString()} customers
          </span>
          {active > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => onChange({ ...EMPTY_AUDIENCE, requireEmail: false })}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      {open ? (
        <>
          <Separator />
          <div className="grid gap-5 p-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label className="text-xs">RFM segment</Label>
              <div className="flex flex-wrap gap-1.5">
                {SEGMENTS.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => set("segments", toggleIn(filter.segments, segment))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-surface-secondary",
                      filter.segments.includes(segment) && "border-primary bg-primary/10 font-medium",
                    )}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label className="text-xs">Value tier</Label>
              <div className="flex flex-wrap gap-1.5">
                {TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => set("tiers", toggleIn(filter.tiers, tier))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-surface-secondary",
                      filter.tiers.includes(tier) && "border-primary bg-primary/10 font-medium",
                    )}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <NumberField
              label="Spent at least"
              value={filter.minSpend}
              onChange={(v) => set("minSpend", v)}
            />
            <NumberField
              label="Placed at least (orders)"
              value={filter.minOrders}
              onChange={(v) => set("minOrders", v)}
            />
            <div className="space-y-1.5">
              <Label className="text-xs">Churn risk at least</Label>
              <Select
                selectedKey={filter.churnRiskMin === null ? "any" : String(filter.churnRiskMin)}
                onSelectionChange={(v) => set("churnRiskMin", v === "any" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopover><ListBox>
                  <ListBoxItem id="any">Any</ListBoxItem>
                  <ListBoxItem id="0.25">Moderate (25%)</ListBoxItem>
                  <ListBoxItem id="0.5">Elevated (50%)</ListBoxItem>
                  <ListBoxItem id="0.75">High (75%)</ListBoxItem>
                </ListBox></SelectPopover>
              </Select>
            </div>

            <NumberField
              label="Last ordered at least (days ago)"
              value={filter.recencyMin}
              onChange={(v) => set("recencyMin", v)}
            />
            <NumberField
              label="Last ordered within (days)"
              value={filter.recencyMax}
              onChange={(v) => set("recencyMax", v)}
            />

            {countries.length > 1 ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Select
                  selectedKey={filter.countries[0] ?? "any"}
                  onSelectionChange={(v) => set("countries", v === "any" ? [] : [String(v)])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopover><ListBox>
                    <ListBoxItem id="any">All countries</ListBoxItem>
                    {countries.map((c) => (
                      <ListBoxItem key={c} id={c}>
                        {c}
                      </ListBoxItem>
                    ))}
                  </ListBox></SelectPopover>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="filter-product">
                Bought a product matching
              </Label>
              <Input
                id="filter-product"
                value={filter.boughtProduct}
                onChange={(e) => set("boughtProduct", e.target.value)}
                placeholder="e.g. soap"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Contactable</Label>
              <Select
                selectedKey={filter.requireEmail ? "yes" : "any"}
                onSelectionChange={(v) => set("requireEmail", v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopover><ListBox>
                  <ListBoxItem id="any">Everyone</ListBoxItem>
                  <ListBoxItem id="yes">Has an email on file</ListBoxItem>
                </ListBox></SelectPopover>
              </Select>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="any"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

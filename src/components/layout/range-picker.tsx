"use client";

import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { RANGE_PRESETS, useAnalytics } from "@/components/providers/analytics-provider";
import { Button } from "@heroui/react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@heroui/react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RangePicker() {
  const { presetId, range, setPreset, setCustomRange, data } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>();

  const activeLabel =
    presetId === "custom" && range
      ? `${formatDate(range.from)} – ${formatDate(range.to)}`
      : (RANGE_PRESETS.find((p) => p.id === presetId)?.label ?? "Last 30 days");

  const bounds = data?.meta.dataBounds;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-normal">
          <CalendarDays className="size-4" />
          <span className="hidden sm:inline">{activeLabel}</span>
          <span className="sm:hidden">Range</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <ul className="min-w-[11rem] p-1.5">
            {RANGE_PRESETS.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPreset(preset.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    presetId === preset.id && "font-medium",
                  )}
                >
                  {preset.label}
                  {presetId === preset.id ? <Check className="size-4" strokeWidth={3} /> : null}
                </button>
              </li>
            ))}
          </ul>

          <Separator orientation="vertical" className="hidden h-auto sm:block" />

          <div className="border-t p-2 sm:border-t-0">
            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={range ? new Date(range.to) : undefined}
              selected={
                draft ?? (range ? { from: new Date(range.from), to: new Date(range.to) } : undefined)
              }
              onSelect={(next) => {
                setDraft(next);
                if (next?.from && next?.to) {
                  setCustomRange({ from: toIso(next.from), to: toIso(next.to) });
                  setOpen(false);
                  setDraft(undefined);
                }
              }}
              disabled={
                bounds
                  ? { before: new Date(bounds.from), after: new Date(bounds.to) }
                  : undefined
              }
            />
            {bounds ? (
              <p className="px-2 pb-1 text-[11px] text-muted-foreground">
                Data available {formatDate(bounds.from)} – {formatDate(bounds.to)}
              </p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

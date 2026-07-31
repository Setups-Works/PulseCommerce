"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnalyticsPage } from "@/components/dashboard/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { REPORT_CATALOGUE, type ReportId } from "@/lib/export/datasets";
import { formatDate } from "@/lib/format";
import { useReportDownload, type ExportFormat } from "@/lib/use-report-download";
import { cn } from "@/lib/utils";
import type { AnalyticsResult } from "@/lib/analytics/types";

const PRESETS: { id: string; name: string; description: string; reports: ReportId[] }[] = [
  {
    id: "board",
    name: "Board pack",
    description: "The numbers a monthly review actually needs: performance, who's buying, what's selling.",
    reports: ["executive", "segments", "products", "categories", "cohorts", "forecast"],
  },
  {
    id: "crm",
    name: "CRM upload",
    description: "Customer-level records with segments and churn risk, ready to import into a marketing tool.",
    reports: ["customers", "segments", "companies"],
  },
  {
    id: "merch",
    name: "Merchandising review",
    description: "Catalogue performance, stock cover and what sells alongside what.",
    reports: ["products", "categories", "geography"],
  },
  {
    id: "finance",
    name: "Finance reconciliation",
    description: "Every order with totals, tax, shipping and discount, plus the payment and status breakdown.",
    reports: ["orders", "operations", "executive"],
  },
  {
    id: "everything",
    name: "Complete export",
    description: "All eleven reports in one workbook.",
    reports: REPORT_CATALOGUE.map((r) => r.id),
  },
];

export default function ReportsPage() {
  return <AnalyticsPage>{(data) => <ReportsContent data={data} />}</AnalyticsPage>;
}

function ReportsContent({ data }: { data: AnalyticsResult }) {
  const [selected, setSelected] = useState<ReportId[]>(["executive", "customers", "products"]);
  const { download, isPending, pending } = useReportDownload();

  const toggle = (id: ReportId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  const applyPreset = (reports: ReportId[]) => setSelected(reports);

  const formats: { id: ExportFormat; label: string; detail: string; icon: typeof FileSpreadsheet }[] = [
    {
      id: "xlsx",
      label: "Excel workbook",
      detail: "One formatted sheet per report, with a cover page, filters and currency formatting.",
      icon: FileSpreadsheet,
    },
    {
      id: "pdf",
      label: "PDF report",
      detail: "Branded cover with headline KPIs and findings, then a table per report. Capped at 200 rows each.",
      icon: FileText,
    },
    {
      id: "csv",
      label: "CSV",
      detail: "Raw rows for spreadsheets and data pipelines. Multiple reports are concatenated with headers.",
      icon: Table2,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Written report</CardTitle>
              <CardDescription className="text-xs">
                The same period as a document that reads top to bottom: conclusion first, evidence below, method and
                limits at the end.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/reports/view">
                Read the report <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Report builder</CardTitle>
          <CardDescription className="text-xs">
            Every export uses the date range currently selected in the toolbar:{" "}
            <span className="font-medium text-foreground">
              {formatDate(data.meta.range.from)} to {formatDate(data.meta.range.to)}
            </span>
            , {data.meta.orderCount.toLocaleString()} orders. Unlike the on-screen tables, exports are never
            row-capped except in PDF.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5" /> Start from a preset
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.reports)}
                  title={preset.description}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    "hover:border-primary/40 hover:bg-accent",
                    sameSet(preset.reports, selected) && "border-primary bg-primary/10 font-medium",
                  )}
                >
                  {preset.name}
                  <span className="ml-1.5 text-muted-foreground">{preset.reports.length}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Reports to include ({selected.length} of {REPORT_CATALOGUE.length})
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelected(REPORT_CATALOGUE.map((r) => r.id))}
                >
                  Select all
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected([])}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {REPORT_CATALOGUE.map((report) => {
                const active = selected.includes(report.id);
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => toggle(report.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex gap-2.5 rounded-lg border p-3 text-left transition-colors",
                      "hover:border-primary/40 hover:bg-accent/50",
                      active && "border-primary bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {active ? <CheckCircle2 className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-xs font-medium">{report.name}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {report.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {formats.map((format) => {
          const Icon = format.icon;
          const busy = pending === `${format.id}:${selected.join(",")}`;
          return (
            <Card key={format.id} className="flex flex-col justify-between">
              <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  {format.label}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">{format.detail}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={isPending || selected.length === 0}
                  onClick={() => download(selected, format.id)}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                  Download {format.id.toUpperCase()}
                </Button>
                {selected.length === 0 ? (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Select a report first.</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">What&apos;s in each report</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {REPORT_CATALOGUE.map((report) => (
              <li key={report.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0">
                <span className="min-w-[12rem] font-medium">{report.name}</span>
                <span className="flex-1 text-xs text-muted-foreground">{report.description}</span>
                {selected.includes(report.id) ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Included
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function sameSet(a: ReportId[], b: ReportId[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

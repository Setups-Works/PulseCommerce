"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAnalytics } from "@/components/providers/analytics-provider";
import type { ReportId } from "@/lib/export/datasets";

export type ExportFormat = "csv" | "xlsx" | "pdf";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel workbook",
  pdf: "PDF report",
};

/**
 * Requests a report from the server and hands the browser the file.
 *
 * The export always uses the date range currently on screen, so a downloaded
 * report can never silently disagree with the dashboard it came from.
 */
export function useReportDownload() {
  const { queryParams } = useAnalytics();
  const [pending, setPending] = useState<string | null>(null);

  const download = useCallback(
    async (reports: ReportId[], format: ExportFormat) => {
      if (reports.length === 0) {
        toast.error("Select at least one report to download.");
        return;
      }

      const jobId = `${format}:${reports.join(",")}`;
      setPending(jobId);

      const toastId = toast.loading(`Building ${FORMAT_LABELS[format]}…`, {
        description: `${reports.length} report${
          reports.length > 1 ? "s" : ""
        } · this can take a moment for large ranges.`,
      });

      try {
        const res = await fetch("/api/reports/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format,
            reports,
            from: queryParams.from,
            to: queryParams.to,
            granularity: queryParams.granularity,
          }),
        });

        if (!res.ok) {
          const problem = await res.json().catch(() => ({ error: `Request failed with ${res.status}` }));
          throw new Error(problem.error ?? "Report generation failed.");
        }

        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = /filename="([^"]+)"/.exec(disposition);
        const filename = match?.[1] ?? `report.${format}`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        // Revoke on a later tick so Safari has finished reading the blob.
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        toast.success(`${FORMAT_LABELS[format]} downloaded`, {
          id: toastId,
          description: `${filename} · ${formatBytes(blob.size)}`,
        });
      } catch (error) {
        toast.error("Export failed", {
          id: toastId,
          description: error instanceof Error ? error.message : "Something went wrong.",
        });
      } finally {
        setPending(null);
      }
    },
    [queryParams],
  );

  return { download, pending, isPending: pending !== null };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

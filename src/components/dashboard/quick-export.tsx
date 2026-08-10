"use client";

import { Download, FileSpreadsheet, FileText, Loader2, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { Menu, MenuItem, Popover, PopoverTrigger, Separator } from "@heroui/react";
import type { ReportId } from "@/lib/export/datasets";
import { useReportDownload } from "@/lib/use-report-download";

/** The report that matches whatever page the user is looking at. */
const PAGE_REPORTS: Record<string, { id: ReportId; label: string }> = {
  "/dashboard": { id: "executive", label: "this dashboard" },
  "/forecast": { id: "forecast", label: "the forecast" },
  "/customers": { id: "customers", label: "the customer ledger" },
  "/cohorts": { id: "cohorts", label: "cohort retention" },
  "/acquisition": { id: "customers", label: "the customer ledger" },
  "/products": { id: "products", label: "product performance" },
  "/orders": { id: "orders", label: "the order register" },
};

export function QuickExport() {
  const pathname = usePathname();
  const { download, isPending } = useReportDownload();
  const match = PAGE_REPORTS[pathname];

  if (!match) {
    return (
      <Link href="/reports">
          <Download className="size-4" />
          <span className="hidden sm:inline">Reports</span>
        </Link>
    );
  }

  return (
    <PopoverTrigger>
      <PopoverTrigger>
        <Button variant="outline" size="sm" className="gap-1.5" isDisabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">Export</span>
        </Button>
      </PopoverTrigger>
      <Popover><Menu>
        <div className="text-xs font-normal text-muted-foreground">
          Download {match.label} for the selected range
        </div>
        <Separator />
        <MenuItem onAction={() => download([match.id], "xlsx")}>
          <FileSpreadsheet className="size-4" />
          Excel workbook (.xlsx)
        </MenuItem>
        <MenuItem onAction={() => download([match.id], "pdf")}>
          <FileText className="size-4" />
          PDF report (.pdf)
        </MenuItem>
        <MenuItem onAction={() => download([match.id], "csv")}>
          <Table2 className="size-4" />
          Raw data (.csv)
        </MenuItem>
        <Separator />
        <MenuItem>
          <Link href="/reports">
            <Download className="size-4" />
            Build a custom report…
          </Link>
        </MenuItem>
      </Menu></Popover>
    </PopoverTrigger>
  );
}

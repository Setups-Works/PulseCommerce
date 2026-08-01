import { NextResponse } from "next/server";
import { z } from "zod";
import { computeAnalytics } from "@/lib/analytics/engine";
import { sheetsToCsv, sheetToCsv } from "@/lib/export/csv";
import { buildSheet, REPORT_IDS, type ReportId, type Sheet } from "@/lib/export/datasets";
import { buildPdf } from "@/lib/export/pdf";
import { buildWorkbook } from "@/lib/export/xlsx";
import { loadSnapshot } from "@/lib/store/snapshot";
import { isNotConnected } from "@/lib/store/errors";
import { WooApiError } from "@/lib/woo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Big stores + a full workbook can take a while to assemble. */
export const maxDuration = 120;

const schema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]),
  reports: z.array(z.enum(REPORT_IDS)).min(1, "Pick at least one report."),
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(["day", "week", "month"]).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(" ") }, { status: 422 });
  }

  const { format, reports, from, to, granularity } = parsed.data;

  try {
    const snapshot = await loadSnapshot();
    const result = computeAnalytics(snapshot, {
      range: from && to ? { from, to } : undefined,
      granularity,
      // Exports are the complete record — the UI row caps don't apply.
      maxOrderRows: Number.MAX_SAFE_INTEGER,
      maxCustomerRows: Number.MAX_SAFE_INTEGER,
      includeHistory: true,
    });

    const sheets: Sheet[] = (reports as ReportId[]).map((id) => buildSheet(id, result));
    const stamp = `${result.meta.range.from}_${result.meta.range.to}`;
    const slug = slugify(result.meta.storeName);
    const single = sheets.length === 1 ? sheets[0].id : "analytics";
    const filename = `${slug}-${single}-${stamp}`;

    if (format === "csv") {
      const csv = sheets.length === 1 ? sheetToCsv(sheets[0], { includeHeaderBlock: true }) : sheetsToCsv(sheets);
      return fileResponse(Buffer.from(csv, "utf8"), `${filename}.csv`, "text/csv; charset=utf-8");
    }

    if (format === "xlsx") {
      const buffer = await buildWorkbook(result, sheets);
      return fileResponse(
        buffer,
        `${filename}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    }

    const buffer = buildPdf(result, sheets);
    return fileResponse(buffer, `${filename}.pdf`, "application/pdf");
  } catch (error) {
    if (isNotConnected(error)) {
      return NextResponse.json({ error: error.message, code: "not_connected" }, { status: 409 });
    }
    if (error instanceof WooApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[export] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed." },
      { status: 500 },
    );
  }
}

function fileResponse(buffer: Buffer, filename: string, contentType: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "store"
  );
}

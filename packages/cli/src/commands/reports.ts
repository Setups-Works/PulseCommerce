import { writeFileSync } from "node:fs";
import { Command } from "commander";
import { clientFor, reportApiError } from "../sdk.js";

interface ExportOpts {
  format: "xlsx" | "pdf" | "csv";
  reports: string;
  from?: string;
  to?: string;
  out: string;
}

export function registerReportsCommand(program: Command): void {
  const reports = program.command("reports").description("Excel, PDF and CSV exports");

  reports
    .command("export")
    .description("Generate an export (POST /api/reports/export)")
    .requiredOption("--format <format>", "xlsx | pdf | csv")
    .requiredOption("--reports <list>", "comma-separated report names")
    .option("--from <date>", "YYYY-MM-DD")
    .option("--to <date>", "YYYY-MM-DD")
    .requiredOption("--out <path>", "file to write the export to")
    .action(async function (this: Command, opts: ExportOpts) {
      const client = clientFor(this.optsWithGlobals());
      try {
        const buffer = await client.reports.export({
          format: opts.format,
          reports: opts.reports.split(",").map((r) => r.trim()),
          from: opts.from,
          to: opts.to,
        });
        writeFileSync(opts.out, Buffer.from(buffer));
        console.log(`Wrote ${opts.out}`);
      } catch (err) {
        reportApiError(err);
      }
    });
}

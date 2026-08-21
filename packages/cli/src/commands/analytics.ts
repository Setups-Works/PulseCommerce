import { Command } from "commander";
import { clientFor, reportApiError } from "../sdk.js";
import { printJson } from "../lib/output.js";

interface AnalyticsOpts {
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  refresh?: boolean;
}

export function registerAnalyticsCommand(program: Command): void {
  program
    .command("analytics")
    .description("Every metric for a date range (GET /api/analytics)")
    .option("--from <date>", "YYYY-MM-DD")
    .option("--to <date>", "YYYY-MM-DD")
    .option("--granularity <granularity>", "day | week | month")
    .option("--refresh", "bypass every cache and re-pull")
    .option("--json", "print raw JSON (default)")
    .action(async function (this: Command, opts: AnalyticsOpts) {
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.analytics.get(opts));
      } catch (err) {
        reportApiError(err);
      }
    });
}

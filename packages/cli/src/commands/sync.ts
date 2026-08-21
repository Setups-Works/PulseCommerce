import { Command } from "commander";
import { clientFor, reportApiError } from "../sdk.js";
import { confirm } from "../lib/confirm.js";
import { printFields, printJson } from "../lib/output.js";

export function registerSyncCommand(program: Command): void {
  const sync = program.command("sync").description("The local mirror of your WooCommerce store");

  sync
    .command("status")
    .description("How current the mirrored data is (GET /api/sync)")
    .option("--json", "print raw JSON")
    .action(async function (this: Command, opts: { json?: boolean }) {
      const client = clientFor(this.optsWithGlobals());
      try {
        const status = await client.sync.status();
        if (opts.json) return printJson(status);
        printFields({
          "Last synced": status.lastSyncAt ?? "never",
          Orders: status.orders,
          Customers: status.customers,
          Products: status.products,
          "Last run": status.lastRun ? `${status.lastRun.status} (${status.lastRun.mode})` : "-",
        });
      } catch (err) {
        reportApiError(err);
      }
    });

  sync
    .command("run")
    .description("Pull from WooCommerce now (POST /api/sync)")
    .option("--full", "re-read the entire order history, not just what changed — can take minutes")
    .option("-y, --yes", "skip the confirmation prompt for --full")
    .action(async function (this: Command, opts: { full?: boolean; yes?: boolean }) {
      if (opts.full && !opts.yes) {
        const ok = await confirm("A full resync can take minutes on a large store. Continue?");
        if (!ok) return console.log("Cancelled.");
      }
      const client = clientFor(this.optsWithGlobals());
      try {
        const result = await client.sync.run({ full: opts.full });
        printFields({
          Mode: result.mode,
          Orders: result.orders,
          Customers: result.customers,
          Products: result.products,
          "Duration (ms)": result.durationMs,
        });
        for (const warning of result.warnings) console.log(`Warning: ${warning}`);
      } catch (err) {
        reportApiError(err);
      }
    });
}

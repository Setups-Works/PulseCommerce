import { Command } from "commander";
import { clientFor, reportApiError } from "../sdk.js";
import { printJson } from "../lib/output.js";

export function registerCustomersCommand(program: Command): void {
  const customers = program.command("customers").description("Individual customer records");

  customers
    .command("get <key>")
    .description("One customer, with order history (GET /api/customers/{key})")
    .option("--from <date>", "YYYY-MM-DD")
    .option("--to <date>", "YYYY-MM-DD")
    .action(async function (this: Command, key: string, opts: { from?: string; to?: string }) {
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.customers.get(key, opts));
      } catch (err) {
        reportApiError(err);
      }
    });
}

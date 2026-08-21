import { Command } from "commander";
import { clientFor, reportApiError } from "../sdk.js";
import { printJson } from "../lib/output.js";

export function registerFlowsCommand(program: Command): void {
  const flows = program.command("flows").description("Multi-step campaigns advanced on a schedule");

  flows
    .command("list")
    .description("Every flow, with its progress (GET /api/whatsapp/flows)")
    .action(async function (this: Command) {
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.flows.list());
      } catch (err) {
        reportApiError(err);
      }
    });

  flows
    .command("get <id>")
    .description("One flow, its steps and what is due next (GET /api/whatsapp/flows/{id})")
    .action(async function (this: Command, id: string) {
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.flows.get(id));
      } catch (err) {
        reportApiError(err);
      }
    });
}

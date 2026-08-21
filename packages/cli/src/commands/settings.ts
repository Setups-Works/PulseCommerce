import { Command } from "commander";
import { clientFor, reportApiError } from "../sdk.js";
import { printJson } from "../lib/output.js";

export function registerSettingsCommand(program: Command): void {
  const settings = program.command("settings").description("Store connection state");

  settings
    .command("show")
    .description("Connected stores and the active one (GET /api/settings)")
    .action(async function (this: Command) {
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.settings.get());
      } catch (err) {
        reportApiError(err);
      }
    });
}

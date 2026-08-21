import { Command } from "commander";
import { configPath, maskKey, readConfig, resolveBaseUrl, writeConfig } from "../config.js";

/**
 * Local credentials only. There is deliberately no `pulse keys` command — the
 * API refuses to create or revoke a key for anyone authenticated with a key
 * rather than a dashboard session, so key management can only ever happen in
 * Settings → API keys. This command just stores the result of that.
 */
export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("Local CLI credentials");

  // `--api-key`/`--base-url` are declared once, as global options on the root
  // program (see index.ts), so they can override credentials for any single
  // call. This subcommand deliberately does not redeclare them locally —
  // Commander resolves a name declared at two levels in favour of the
  // ancestor's, so a local redeclaration here would silently swallow the
  // value and leave it out of the saved config.
  config
    .command("set")
    .description("Save an API key and/or base URL")
    .action(function (this: Command) {
      const opts = this.optsWithGlobals() as { apiKey?: string; baseUrl?: string };
      if (!opts.apiKey && !opts.baseUrl) {
        console.error("Nothing to save — pass --api-key and/or --base-url.");
        process.exit(1);
      }
      writeConfig({
        apiKey: opts.apiKey,
        baseUrl: opts.baseUrl?.replace(/\/+$/, ""),
      });
      console.log(`Saved to ${configPath()}`);
    });

  config
    .command("show")
    .description("Print the saved base URL and a masked key")
    .action(() => {
      const saved = readConfig();
      const source = saved.baseUrl ? "saved" : process.env.PULSE_BASE_URL ? "env" : "default";
      console.log(`Config file   ${configPath()}`);
      console.log(`Base URL      ${resolveBaseUrl({})} (${source})`);
      console.log(`API key       ${saved.apiKey ? maskKey(saved.apiKey) : "(not set)"}`);
    });
}

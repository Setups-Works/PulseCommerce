#!/usr/bin/env node
import { Command } from "commander";
import { registerAnalyticsCommand } from "./commands/analytics.js";
import { registerCampaignsCommand } from "./commands/campaigns.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerCustomersCommand } from "./commands/customers.js";
import { registerFlowsCommand } from "./commands/flows.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerReportsCommand } from "./commands/reports.js";
import { registerSettingsCommand } from "./commands/settings.js";
import { registerSyncCommand } from "./commands/sync.js";

/**
 * The PulseCommerce CLI.
 *
 * A thin client over the same REST API the dashboard uses, built on
 * `pulsecommerce-sdk` — this file and the `commands/` it registers are
 * terminal UX (flags, prompts, config storage) on top of that library, not a
 * second implementation of the HTTP calls.
 *
 * `pulse login` is the primary way to get an API key: it opens a browser,
 * you approve in a session that's already signed in, and the key comes back
 * without ever being typed or pasted. `pulse config set --api-key ...` is
 * the fallback for CI and anywhere a browser can't open.
 *
 * There is deliberately no `pulse keys` command. Key creation and revocation
 * require a dashboard session — the API itself refuses both to a request
 * authenticated with a key — so a leaked key can never mint or replace
 * itself, and `pulse login` mints one the same session-gated way Settings
 * does, just without the copy-paste.
 */

const program = new Command();

program
  .name("pulse")
  .description("Command-line client for the PulseCommerce API")
  .version("0.1.0")
  .option("--api-key <key>", "API key to use — overrides the saved config for this call, or is what `config set` saves")
  .option("--base-url <url>", "base URL to use — overrides the saved config for this call, or is what `config set` saves");

registerConfigCommand(program);
registerLoginCommand(program);
registerSyncCommand(program);
registerAnalyticsCommand(program);
registerCustomersCommand(program);
registerSettingsCommand(program);
registerReportsCommand(program);
registerCampaignsCommand(program);
registerFlowsCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

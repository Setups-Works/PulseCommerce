import { Command } from "commander";
import { PulseCommerceClient, PulseApiError, type Scope } from "pulsecommerce-sdk";
import { resolveBaseUrl, writeConfig } from "../config.js";
import { maskKey } from "../config.js";
import { openBrowser } from "../lib/browser.js";
import { reportApiError } from "../sdk.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Sign in through your browser, the way gh/vercel/doctl do")
    .option("--scopes <scopes>", "comma-separated: read, write", "read,write")
    .option("--no-open", "don't try to open a browser automatically")
    .action(async function (this: Command, opts: { scopes: string; open: boolean }) {
      const globals = this.optsWithGlobals() as { baseUrl?: string };
      const baseUrl = resolveBaseUrl(globals);
      const scopes = opts.scopes.split(",").map((s) => s.trim()) as Scope[];
      const client = new PulseCommerceClient({ baseUrl });

      try {
        const start = await client.auth.startDeviceLogin(scopes);

        console.log(`First, copy your code: ${start.userCode}`);
        console.log(`Then open: ${start.verificationUrl}`);
        if (opts.open) openBrowser(start.verificationUrl);
        console.log("\nWaiting for approval...");

        const deadline = Date.now() + start.expiresIn * 1000;
        while (Date.now() < deadline) {
          await sleep(start.interval * 1000);
          const poll = await client.auth.pollDeviceLogin(start.deviceCode);

          if (poll.status === "pending") continue;
          if (poll.status === "denied") {
            console.error("Login was denied.");
            process.exit(1);
          }
          if (poll.status === "expired") {
            console.error("That code expired. Run `pulse login` again.");
            process.exit(1);
          }

          writeConfig({ apiKey: poll.key, baseUrl });
          console.log(`\nSigned in. Key ${maskKey(poll.key)} saved.`);
          return;
        }

        console.error("Timed out waiting for approval. Run `pulse login` again.");
        process.exit(1);
      } catch (err) {
        if (err instanceof PulseApiError) reportApiError(err);
        throw err;
      }
    });

  program
    .command("logout")
    .description("Remove the saved API key")
    .action(() => {
      writeConfig({ apiKey: undefined });
      console.log("Signed out.");
    });
}

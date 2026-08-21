import { readFileSync } from "node:fs";
import { Command } from "commander";
import type { CampaignRequest, MessageInput } from "pulsecommerce-sdk";
import { clientFor, reportApiError } from "../sdk.js";
import { confirm } from "../lib/confirm.js";
import { printFields, printJson } from "../lib/output.js";

function readJsonFile<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`Could not read ${path}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

export function registerCampaignsCommand(program: Command): void {
  const campaigns = program.command("campaigns").description("Audience resolution and broadcasts");

  campaigns
    .command("preview")
    .description("Dry run — resolve recipients and send nothing (POST /api/whatsapp/preview)")
    .requiredOption("--file <path>", "JSON file with {filter, range?, customerKeys?, message?}")
    .action(async function (this: Command, opts: { file: string }) {
      const client = clientFor(this.optsWithGlobals());
      const body = readJsonFile<CampaignRequest>(opts.file);
      try {
        const result = await client.campaigns.preview(body);
        printFields({
          Matched: result.matched,
          Deliverable: result.deliverable,
          "Skipped (no phone)": result.skipped.noPhone,
          "Skipped (unparseable)": result.skipped.unparseable,
          "Skipped (opted out)": result.skipped.optedOut,
          "Skipped (duplicate)": result.skipped.duplicate,
          "Estimated (ms)": result.estimatedMs,
        });
      } catch (err) {
        reportApiError(err);
      }
    });

  campaigns
    .command("broadcast")
    .description("Preview, confirm, then send (POST /api/whatsapp/broadcast)")
    .requiredOption("--file <path>", "JSON file with {filter, range?, customerKeys?, message?}")
    .option("-y, --yes", "skip the confirmation prompt")
    .action(async function (this: Command, opts: { file: string; yes?: boolean }) {
      const client = clientFor(this.optsWithGlobals());
      const body = readJsonFile<CampaignRequest>(opts.file);
      try {
        const preview = await client.campaigns.preview(body);
        printFields({
          Matched: preview.matched,
          Deliverable: preview.deliverable,
          "Skipped (opted out)": preview.skipped.optedOut,
        });

        if (preview.deliverable === 0) {
          console.log("Nobody in this audience is reachable — nothing to send.");
          return;
        }

        if (!opts.yes) {
          const ok = await confirm(`Send to ${preview.deliverable} recipient(s)?`);
          if (!ok) return console.log("Cancelled.");
        }

        const job = await client.campaigns.broadcast({ ...body, confirm: preview.deliverable });
        printFields({ Id: job.id, Status: job.status, Total: job.total });
      } catch (err) {
        reportApiError(err);
      }
    });

  campaigns
    .command("test")
    .description("Send one message to a number typed by hand (POST /api/whatsapp/test)")
    .requiredOption("--phone <number>", "e.g. +91 98765 43210")
    .requiredOption("--file <path>", "JSON file with the Message object")
    .option("-y, --yes", "skip the confirmation prompt")
    .action(async function (this: Command, opts: { phone: string; file: string; yes?: boolean }) {
      if (!opts.yes) {
        const ok = await confirm(`Send a real message to ${opts.phone}?`);
        if (!ok) return console.log("Cancelled.");
      }
      const client = clientFor(this.optsWithGlobals());
      const message = readJsonFile<MessageInput>(opts.file);
      try {
        printJson(await client.campaigns.test({ phone: opts.phone, message }));
      } catch (err) {
        reportApiError(err);
      }
    });

  campaigns
    .command("status <broadcastId>")
    .description("Progress for one broadcast (GET /api/whatsapp/broadcast/{id})")
    .action(async function (this: Command, broadcastId: string) {
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.campaigns.status(broadcastId));
      } catch (err) {
        reportApiError(err);
      }
    });

  campaigns
    .command("cancel <broadcastId>")
    .description("Stop a broadcast — batches already accepted still go out (DELETE /api/whatsapp/broadcast/{id})")
    .option("-y, --yes", "skip the confirmation prompt")
    .action(async function (this: Command, broadcastId: string, opts: { yes?: boolean }) {
      if (!opts.yes) {
        const ok = await confirm(`Cancel broadcast ${broadcastId}?`);
        if (!ok) return console.log("Cancelled.");
      }
      const client = clientFor(this.optsWithGlobals());
      try {
        printJson(await client.campaigns.cancel(broadcastId));
      } catch (err) {
        reportApiError(err);
      }
    });
}

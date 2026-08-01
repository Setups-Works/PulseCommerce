import { z } from "zod";
import { EMPTY_AUDIENCE, type AudienceFilter } from "@/lib/audience";

/**
 * Wire validation for anything that can cause a message to be sent.
 *
 * The filter is accepted loosely and merged onto EMPTY_AUDIENCE, so a client
 * that omits a field gets the safe default rather than undefined leaking into
 * the matcher. Nothing here accepts a phone number: recipients are always
 * derived server-side from the connected store.
 */

export const audienceFilterSchema = z
  .object({
    segments: z.array(z.string()).optional(),
    tiers: z.array(z.string()).optional(),
    recencyMin: z.number().nullable().optional(),
    recencyMax: z.number().nullable().optional(),
    minSpend: z.number().nullable().optional(),
    minOrders: z.number().nullable().optional(),
    churnRiskMin: z.number().min(0).max(1).nullable().optional(),
    countries: z.array(z.string()).optional(),
    accountType: z.enum(["any", "business", "consumer"]).optional(),
    boughtProduct: z.string().optional(),
    requireEmail: z.boolean().optional(),
    requirePhone: z.boolean().optional(),
  })
  .transform((raw): AudienceFilter => ({
    ...EMPTY_AUDIENCE,
    ...raw,
    // Phone reachability is not optional for a WhatsApp send, whatever the
    // client asked for — an unreachable recipient is only ever noise.
    requirePhone: true,
    segments: (raw.segments ?? []) as AudienceFilter["segments"],
    tiers: (raw.tiers ?? []) as AudienceFilter["tiers"],
    countries: raw.countries ?? [],
    boughtProduct: raw.boughtProduct ?? "",
    accountType: raw.accountType ?? "any",
  }));

export const rangeSchema = z
  .object({ from: z.string(), to: z.string() })
  .optional();

export const messageSchema = z
  .object({
    type: z.enum(["text", "image", "video"]),
    text: z.string().min(1, "A message body is required.").max(4000),
    mediaUrl: z.string().url().optional(),
    /** Each recipient gets their own product photo instead of a shared one. */
    useProductImage: z.boolean().optional(),
  })
  .refine((m) => m.type === "text" || m.useProductImage || Boolean(m.mediaUrl), {
    message:
      "An image or video message needs either a media URL or the per-customer product photo.",
    path: ["mediaUrl"],
  });

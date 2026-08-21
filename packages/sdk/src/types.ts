/**
 * Request/response shapes, hand-written against `src/lib/openapi.ts`.
 *
 * Not generated — that file's own top comment explains why: the routes are
 * Next.js handlers with Zod validation inside them, and no generator reads
 * that combination faithfully. Keeping this file's shapes matched to the
 * OpenAPI document by hand is the same trade this project already made once.
 */

export type Scope = "read" | "write";

export interface SyncStatus {
  lastSyncAt: string | null;
  orders: number;
  customers: number;
  products: number;
  lastRun: { status: string; mode: string; error: string | null; finishedAt: string | null } | null;
}

export interface SyncResult {
  ok: boolean;
  mode: "full" | "incremental";
  orders: number;
  customers: number;
  products: number;
  warnings: string[];
  durationMs: number;
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  refresh?: boolean;
}

/** The full payload's shape varies by section; left as a record rather than pinned field-by-field. */
export type AnalyticsPayload = Record<string, unknown>;

export interface SettingsState {
  connected: boolean;
  activeUrl: string | null;
  stores: unknown[];
}

export interface ExportRequest {
  format: "xlsx" | "pdf" | "csv";
  reports: string[];
  from?: string;
  to?: string;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface MessageInput {
  type: "text" | "image" | "video";
  text: string;
  mediaUrl?: string;
  useProductImage?: boolean;
  coupon?: { code?: string; value?: string };
  product?: { name?: string; url?: string; image?: string; category?: string };
}

export interface AudienceFilter {
  segments?: string[];
  tiers?: string[];
  recencyMin?: number | null;
  recencyMax?: number | null;
  minSpend?: number | null;
  minOrders?: number | null;
  churnRiskMin?: number | null;
  countries?: string[];
  accountType?: "any" | "business" | "consumer";
  boughtProduct?: string;
  requireEmail?: boolean;
  requirePhone?: boolean;
}

export interface CampaignRequest {
  filter: AudienceFilter;
  range?: DateRange;
  customerKeys?: string[];
  message?: MessageInput;
}

export interface PreviewResult {
  matched: number;
  deliverable: number;
  skipped: { noPhone: number; unparseable: number; optedOut: number; duplicate: number };
  sample: string[];
  preview: string | null;
  media: string | null;
  estimatedMs: number;
}

export interface BroadcastRequest extends CampaignRequest {
  confirm: number;
}

export interface Progress {
  id: string;
  status: "sending" | "paused" | "completed" | "cancelled" | "failed";
  total: number;
  handedOff: number;
  remaining: number;
  percent: number;
  skipped?: Record<string, number>;
  estimatedMsRemaining?: number;
  error?: string | null;
}

export interface TestMessageRequest {
  phone: string;
  message: MessageInput;
}

export interface TestMessageResult {
  sent: boolean;
  messageId: string;
  timestamp: number;
}

/** Device-authorization login — see `src/lib/auth/cli-login.ts` on the server. */
export interface DeviceLoginStart {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export type DeviceLoginPoll =
  | { status: "pending" }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "approved"; key: string; record: ApiKeyRecord };

export interface ApiKeyRecord {
  id: string;
  name: string;
  display: string;
  scopes: Scope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt?: string | null;
}

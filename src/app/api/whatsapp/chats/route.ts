import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics/cache";
import { loadSnapshot } from "@/lib/store/snapshot";
import { WhatsAppApiError, WhatsAppClient, type WhatsAppChat } from "@/lib/whatsapp/client";
import { readWhatsAppConfig } from "@/lib/whatsapp/config";
import { phoneMapFromSnapshot } from "@/lib/whatsapp/recipients";
import { normalisePhone } from "@/lib/whatsapp/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How long to wait for customer names before showing the inbox without them. */
const ENRICH_BUDGET_MS = 6000;

export interface InboxChat extends WhatsAppChat {
  /** The customer this number belongs to, when it matches one. */
  customerName: string | null;
  customerKey: string | null;
  orders: number | null;
  spend: number | null;
}

/**
 * Conversations, with the customer behind each number where there is one.
 *
 * The gateway names a chat with WhatsApp's own identifier, which is a long
 * meaningless number for anyone not in the phone's address book. Matching it
 * back to a customer turns the inbox from a list of digits into a list of
 * people, with what they have spent alongside.
 *
 * The lookup is time-boxed. A cold snapshot would otherwise make opening the
 * inbox wait on a full order-history pull, and a list of numbers now is worth
 * more than a list of names in four minutes.
 */
export async function GET() {
  const config = await readWhatsAppConfig();
  if (!config) {
    return NextResponse.json({ error: "No WhatsApp gateway is connected." }, { status: 409 });
  }

  try {
    const chats = await new WhatsAppClient(config).listChats(80);
    const enriched = await withCustomerNames(chats, config.defaultDialCode);
    return NextResponse.json({ chats: enriched });
  } catch (error) {
    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read conversations." },
      { status: 500 },
    );
  }
}

async function withCustomerNames(
  chats: WhatsAppChat[],
  defaultDialCode: string,
): Promise<InboxChat[]> {
  const bare = (chat: WhatsAppChat): InboxChat => ({
    ...chat,
    customerName: null,
    customerKey: null,
    orders: null,
    spend: null,
  });

  const lookup = (async () => {
    const snapshot = await loadSnapshot();
    const analytics = getAnalytics(snapshot);
    const phoneByKey = phoneMapFromSnapshot(snapshot);

    // Index customers by the same E.164 form a chat id reduces to, so the two
    // sides match regardless of how the number was typed at checkout.
    const byNumber = new Map<string, { name: string; key: string; orders: number; spend: number }>();
    for (const customer of analytics.customers.records) {
      const raw = phoneByKey.get(customer.key);
      if (!raw) continue;
      const normalised = normalisePhone(raw, { defaultDialCode, country: customer.country });
      if (!normalised) continue;
      byNumber.set(normalised.e164, {
        name: customer.name,
        key: customer.key,
        orders: customer.orders,
        spend: customer.netRevenue,
      });
    }

    return chats.map((chat) => {
      const digits = chat.id.split("@")[0];
      const match = byNumber.get(digits);
      return {
        ...chat,
        customerName: match?.name ?? null,
        customerKey: match?.key ?? null,
        orders: match?.orders ?? null,
        spend: match?.spend ?? null,
      };
    });
  })();

  const timeout = new Promise<InboxChat[]>((resolve) =>
    setTimeout(() => resolve(chats.map(bare)), ENRICH_BUDGET_MS),
  );

  return Promise.race([lookup, timeout]).catch(() => chats.map(bare));
}

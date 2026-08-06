import * as React from "react";
import { Check, CheckCheck, Mic, Paperclip, Phone, Plus, Video } from "lucide-react";
import { BrandMark, BRANDS } from "@/components/marketing/brand-mark";
import { cn } from "@/lib/utils";

/**
 * A WhatsApp conversation, drawn to fill a phone mock's screen.
 *
 * The counterpart to ProductScreen: that one is what the merchant sees, this is
 * what their customer sees. Half of this product leaves the merchant's browser,
 * and showing that half inside a desktop card would misrepresent where it lands.
 *
 * Built as real elements rather than a screenshot for the same three reasons
 * given in product-screen.tsx — sharp at any width, selectable text, and it
 * cannot go stale.
 *
 * Names and figures are generic placeholders. These pages are public, so a real
 * store's catalogue on one would leak that store's data.
 */

type Sender = "store" | "customer";

interface Line {
  from: Sender;
  /** Rendered above the text: a product card, a menu, a coupon. */
  attachment?: React.ReactNode;
  text: React.ReactNode;
  time: string;
  /** Blue double-tick, on messages the store sent. */
  read?: boolean;
  /** Amber, for the handed-to-a-person case. */
  tone?: "default" | "escalated";
}

function Bubble({ from, attachment, text, time, read, tone = "default" }: Line) {
  const mine = from === "store";
  return (
    <div className={cn("flex", mine ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[82%] rounded-xl px-2 py-1.5 text-[11px] leading-snug shadow-sm",
          mine
            ? "rounded-tl-sm bg-white text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
            : "rounded-tr-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-50",
          tone === "escalated" &&
            "bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-50",
        )}
      >
        {attachment}
        <div>{text}</div>
        <div className="mt-0.5 flex items-center justify-end gap-0.5">
          <span className="text-[8px] opacity-55">{time}</span>
          {mine ? (
            read ? (
              <CheckCheck className="size-2.5 text-sky-500" />
            ) : (
              <Check className="size-2.5 opacity-55" />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The product card that heads a reorder message. */
function ProductAttachment() {
  return (
    <div className="mb-1.5 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
      {/* The photograph, as a block. The real message carries the product
          image pulled from the catalogue; drawing it keeps this page free of
          any particular store's assets. */}
      <div className="flex h-16 items-center justify-center bg-gradient-to-br from-primary/25 to-primary/5">
        <span className="text-[8px] font-medium tracking-wide text-primary uppercase">
          Product photo
        </span>
      </div>
      <div className="px-1.5 py-1">
        <p className="text-[10px] font-medium">Their most-ordered item</p>
        <p className="text-[9px] opacity-60">your-store.com/reorder</p>
      </div>
    </div>
  );
}

const CAMPAIGN: Line[] = [
  {
    from: "store",
    attachment: <ProductAttachment />,
    text: (
      <>
        Hi Anita, your usual refill is running low — you last ordered it eleven weeks ago.
      </>
    ),
    time: "09:14",
    read: true,
  },
  { from: "customer", text: "Yes please — can you send two?", time: "09:21" },
  {
    from: "store",
    text: (
      <>
        Done. Two on the way, and <b>REFILL10</b> takes 10% off this order.
      </>
    ),
    time: "09:21",
    read: true,
  },
  { from: "customer", text: "Perfect, thank you!", time: "09:22" },
];

const AUTO_REPLY: Line[] = [
  { from: "customer", text: "Hi", time: "23:41" },
  {
    from: "store",
    text: (
      <>
        <span className="block font-medium">Hello! How can we help?</span>
        <span className="mt-0.5 block">
          1 · Track my order
          <br />
          2 · Reorder something
          <br />
          3 · Talk to a person
        </span>
      </>
    ),
    time: "23:41",
    read: true,
  },
  { from: "customer", text: "2", time: "23:42" },
  {
    from: "store",
    text: (
      <>
        Here is what you bought last time. Reply <b>YES</b> and we will set it up.
      </>
    ),
    time: "23:42",
    read: true,
  },
  { from: "customer", text: "Actually, is it safe for sensitive skin?", time: "23:43" },
  {
    from: "store",
    tone: "escalated",
    text: (
      <>
        <span className="block text-[8px] font-semibold tracking-wide uppercase">
          Handed to a person
        </span>
        Not a menu option — so the bot stopped and your team was notified.
      </>
    ),
    time: "23:43",
    read: true,
  },
];

export const PHONE_CONVERSATIONS = {
  campaign: { status: "business account", lines: CAMPAIGN },
  autoReply: { status: "typically replies instantly", lines: AUTO_REPLY },
} as const;

export type PhoneConversation = keyof typeof PHONE_CONVERSATIONS;

/**
 * Fills the whole screen area of a phone mock: status bar, chat header,
 * conversation and composer. Sized in fixed pixels rather than relative units
 * because the mock scales the whole screen as one block.
 */
export function PhoneScreen({ conversation = "campaign" }: { conversation?: PhoneConversation }) {
  const { status, lines } = PHONE_CONVERSATIONS[conversation];

  return (
    <div className="flex size-full flex-col bg-[#e6dfd6] dark:bg-neutral-900">
      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between bg-emerald-700 px-4 pt-2.5 pb-1 text-[9px] font-medium text-white">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-3.5 rounded-[2px] border border-white/70" />
        </span>
      </div>

      {/* Chat header */}
      <div className="flex shrink-0 items-center gap-2 bg-emerald-700 px-3 pt-1 pb-2.5 text-white">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <BrandMark icon={BRANDS.whatsapp} className="size-4 text-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold">Your Store</span>
          <span className="block truncate text-[9px] text-white/70">{status}</span>
        </span>
        <Video className="size-3.5 shrink-0 opacity-80" />
        <Phone className="size-3.5 shrink-0 opacity-80" />
      </div>

      {/* Conversation */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden px-2.5 py-3">
        {lines.map((line, i) => (
          <Bubble key={i} {...line} />
        ))}
      </div>

      {/* Composer */}
      <div className="flex shrink-0 items-center gap-1.5 px-2 pt-1 pb-3">
        <span className="flex flex-1 items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 dark:bg-neutral-800">
          <Plus className="size-3 opacity-40" />
          <span className="flex-1 text-[10px] opacity-35">Message</span>
          <Paperclip className="size-3 opacity-40" />
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-700">
          <Mic className="size-3.5 text-white" />
        </span>
      </div>
    </div>
  );
}

"use client";

import { ArrowUp, Check, Loader2, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

/**
 * The assistant.
 *
 * Laid out as a conversation rather than a dashboard panel: one centred column,
 * the composer pinned beneath it, no card chrome between the reader and the
 * text. That is the shape people already know from every other chat they use,
 * and a familiar shape is one less thing to learn on a screen whose whole job is
 * answering questions.
 *
 * It reads the store and proposes actions; it never performs one. A proposal
 * arrives as a card with an Approve button, and approving calls the ordinary
 * endpoint for that action — the same one the matching screen calls, with the
 * same guards.
 */

interface Proposal {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  /** URLs the server removed because no tool produced them. */
  droppedUrls?: string[];
}

interface ToolUse {
  name: string;
  input: unknown;
  result: unknown;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: ToolUse[];
  proposals?: Proposal[];
  settled?: Record<string, "approved" | "rejected">;
}

const SUGGESTIONS = [
  "How did revenue do this month against last?",
  "Which customers are about to churn, and what are they worth?",
  "What is about to run out of stock?",
  "Draft a win-back message and tell me how many it would reach",
];

export default function AssistantPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;

    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setDraft("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The assistant could not answer.");

      setTurns([
        ...next,
        {
          role: "assistant",
          content: body.message || "",
          toolsUsed: body.toolsUsed ?? [],
          proposals: body.proposals ?? [],
          settled: {},
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assistant could not answer.";
      setTurns([...next, { role: "assistant", content: message, toolsUsed: [], proposals: [] }]);
    } finally {
      setThinking(false);
      box.current?.focus();
    }
  };

  const approve = async (turnIndex: number, proposal: Proposal) => {
    setApproving(proposal.id);
    try {
      const request = await requestFor(proposal);
      if (!request) throw new Error("That proposal cannot be carried out from here.");

      const res = await fetch(request.url, {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "That did not work.");

      settle(turnIndex, proposal.id, "approved");
      toast.success(request.done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not work.");
    } finally {
      setApproving(null);
    }
  };

  const settle = (turnIndex: number, id: string, outcome: "approved" | "rejected") => {
    setTurns((current) =>
      current.map((turn, i) =>
        i === turnIndex ? { ...turn, settled: { ...turn.settled, [id]: outcome } } : turn,
      ),
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-8 px-4 pt-2 pb-6">
              {turns.length === 0 ? (
                <MessageScrollerItem>
                  <div className="flex flex-col items-center gap-5 py-14 text-center">
                    <span className="flex size-11 items-center justify-center rounded-full bg-muted">
                      <Sparkles className="size-5 text-muted-foreground" />
                    </span>

                    <div className="space-y-1.5">
                      <h1 className="text-xl font-semibold tracking-tight">
                        What would you like to know?
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Ask about your store, or have a message drafted. It proposes; you
                        approve.
                      </p>
                    </div>

                    <div className="mt-1 grid w-full gap-1.5 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void ask(s)}
                          className="rounded-lg border p-2.5 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ShieldCheck className="size-3.5" />
                      It cannot send to an audience, and never sees a phone number.
                    </p>
                  </div>
                </MessageScrollerItem>
              ) : null}

              {turns.map((turn, i) => (
                <MessageScrollerItem key={i} scrollAnchor={i === turns.length - 1}>
                  <Message align={turn.role === "user" ? "end" : "start"}>
                    {turn.role === "assistant" ? (
                      <MessageAvatar className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
                        <Sparkles className="size-3.5 text-muted-foreground" />
                      </MessageAvatar>
                    ) : null}

                    <MessageContent>
                      <BubbleGroup>
                        {turn.toolsUsed?.length ? (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {turn.toolsUsed.map((t, j) => (
                              <Marker key={j}>
                                <MarkerIcon>
                                  <Search className="size-3" />
                                </MarkerIcon>
                                <MarkerContent>{readable(t.name)}</MarkerContent>
                              </Marker>
                            ))}
                          </div>
                        ) : null}

                        {turn.content ? (
                          <Bubble variant={turn.role === "user" ? "default" : "ghost"}>
                            {/* The assistant's own words carry no bubble: it is
                                prose to read, not a message in a thread. */}
                            <BubbleContent
                              className={
                                turn.role === "assistant"
                                  ? "px-0 text-[13px] leading-relaxed whitespace-pre-wrap"
                                  : "whitespace-pre-wrap"
                              }
                            >
                              {turn.content}
                            </BubbleContent>
                          </Bubble>
                        ) : null}

                        {turn.proposals?.map((p) => (
                          <ProposalCard
                            key={p.id}
                            proposal={p}
                            outcome={turn.settled?.[p.id]}
                            busy={approving === p.id}
                            onApprove={() => void approve(i, p)}
                            onReject={() => settle(i, p.id, "rejected")}
                          />
                        ))}
                      </BubbleGroup>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}

              {thinking ? (
                <MessageScrollerItem scrollAnchor>
                  <Message align="start">
                    <MessageAvatar className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Sparkles className="size-3.5 text-muted-foreground" />
                    </MessageAvatar>
                    <MessageContent>
                      <Marker>
                        <MarkerIcon>
                          <Loader2 className="size-3 animate-spin" />
                        </MarkerIcon>
                        <MarkerContent>Reading your store…</MarkerContent>
                      </Marker>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {/* Pinned composer, on the same centred column as the conversation. */}
      <div className="shrink-0 px-4 pb-1">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={box}
              rows={1}
              value={draft}
              disabled={thinking}
              placeholder="Ask about revenue, customers, stock — or ask for a message"
              onChange={(e) => {
                setDraft(e.target.value);
                // Grows with the text the way a chat composer is expected to.
                // Reset first, so it shrinks again when text is deleted.
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(draft);
                }
              }}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <Button
              size="icon"
              className="size-8 shrink-0 rounded-full"
              aria-label="Send"
              disabled={thinking || draft.trim().length === 0}
              onClick={() => void ask(draft)}
            >
              {thinking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>

          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Reads your store directly. Anything that sends or changes something needs your
            approval first.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({
  proposal, outcome, busy, onApprove, onReject,
}: {
  proposal: Proposal;
  outcome?: "approved" | "rejected";
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const described = describe(proposal);

  return (
    <Attachment className="mt-1 w-full max-w-full">
      <AttachmentContent>
        <AttachmentTitle className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" />
          {described.title}
        </AttachmentTitle>
        {described.preview ? (
          <div className="mt-1.5 max-w-[19rem] overflow-hidden rounded-lg rounded-tl-sm border bg-muted">
            {described.preview.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element --
                 catalogue URLs are arbitrary remote hosts; next/image would
                 need every connected store's domain in next.config. */
              <img
                src={described.preview.imageUrl}
                alt=""
                className="max-h-44 w-full bg-background object-contain"
              />
            ) : null}
            <p className="whitespace-pre-wrap p-2.5 text-xs">
              {described.preview.text}
              {described.preview.productUrl ? (
                <>
                  {"\n\n"}
                  <span className="break-all text-primary underline">
                    {described.preview.productUrl}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <AttachmentDescription className="whitespace-pre-wrap">
            {described.detail}
          </AttachmentDescription>
        )}

        {proposal.droppedUrls?.length ? (
          <p className="mt-1.5 text-[11px] text-warning">
            A link the assistant made up was removed, so this message has no
            {proposal.droppedUrls.length === 1 ? " link" : " links"}. Ask it to look the
            product up by name if you want one.
          </p>
        ) : null}

        {outcome ? (
          <p className="mt-1.5 text-[11px] font-medium">
            {outcome === "approved" ? "Approved and carried out." : "Rejected. Nothing happened."}
          </p>
        ) : (
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" className="h-7 gap-1 px-2.5 text-[11px]" disabled={busy} onClick={onApprove}>
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5 text-[11px]" disabled={busy} onClick={onReject}>
              <X className="size-3" />
              Reject
            </Button>
          </div>
        )}
      </AttachmentContent>
    </Attachment>
  );
}

/**
 * Plain English for the approval card. A card nobody reads is not a safeguard.
 *
 * Message proposals carry a `preview`, drawn as WhatsApp will draw it — photo
 * on top, caption under, link beneath. Reading "[image: https://…]" tells you
 * nothing about what the recipient gets; seeing the picture does.
 */
function describe(p: Proposal): {
  title: string;
  detail: string;
  preview?: { text: string; imageUrl?: string; productUrl?: string };
} {
  const input = p.input as Record<string, string | boolean | undefined>;

  switch (p.tool) {
    case "propose_test_message":
      return {
        title: `Send a test message to ${input.phone ?? "a number"}`,
        detail: String(input.text ?? ""),
        preview: {
          text: String(input.text ?? ""),
          imageUrl: typeof input.imageUrl === "string" ? input.imageUrl : undefined,
        },
      };
    case "propose_customer_message":
      return {
        title: `Message ${input.customerName ?? "one customer"}`,
        detail: String(input.text ?? ""),
        preview: {
          text: String(input.text ?? ""),
          imageUrl: typeof input.imageUrl === "string" ? input.imageUrl : undefined,
          productUrl: typeof input.productUrl === "string" ? input.productUrl : undefined,
        },
      };
    case "propose_menu_toggle":
      return {
        title: input.enabled ? "Turn the menu bot on" : "Turn the menu bot off",
        detail: input.enabled
          ? `${input.reason ?? ""}\n\nEvery customer who sends the trigger word will get an automatic reply.`
          : `${input.reason ?? ""}\n\nCustomers who message will get no automatic reply.`,
      };
    case "propose_flow_status":
      return {
        title: `Set flow to ${input.status}`,
        detail:
          input.status === "active"
            ? `${input.reason ?? ""}\n\nStarting a flow means it begins messaging everyone matching its entry audience.`
            : String(input.reason ?? ""),
      };
    case "propose_menu_update":
      return {
        title: "Replace the menu bot's script",
        detail: `Trigger: ${input.trigger || "(any message)"}\n\n${input.greeting ?? ""}`,
      };
    default:
      return { title: p.tool, detail: JSON.stringify(p.input, null, 2) };
  }
}

/**
 * The real request an approval turns into.
 *
 * The menu endpoint replaces the whole menu, so a proposal that only changes one
 * part of it is merged onto what is currently saved. Sending the fragment alone
 * would either be rejected as incomplete or wipe the parts it did not mention.
 */
async function requestFor(p: Proposal): Promise<
  { url: string; method: string; body?: unknown; done: string } | null
> {
  const input = p.input as Record<string, never>;

  switch (p.tool) {
    case "propose_test_message":
      return {
        url: "/api/whatsapp/test",
        method: "POST",
        body: {
          phone: input.phone,
          message: input.imageUrl
            ? { type: "image", text: input.text, mediaUrl: input.imageUrl }
            : { type: "text", text: input.text },
        },
        done: "Message sent.",
      };
    case "propose_menu_toggle":
    case "propose_menu_update": {
      const current = await fetch("/api/whatsapp/menu", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      );
      if (!current?.menu) throw new Error("The current menu could not be read.");

      const merged =
        p.tool === "propose_menu_toggle"
          ? { ...current.menu, enabled: input.enabled }
          : {
              ...current.menu,
              trigger: input.trigger,
              greeting: input.greeting,
              options: input.options,
            };

      return {
        url: "/api/whatsapp/menu",
        method: "PUT",
        body: merged,
        done:
          p.tool === "propose_menu_toggle"
            ? input.enabled
              ? "The menu bot is answering customers now."
              : "The menu bot is off."
            : "The menu bot's script was replaced.",
      };
    }
    case "propose_customer_message": {
      /*
       * One customer, addressed by key. The broadcast endpoint resolves the
       * number server-side from the snapshot and applies the opt-out list, so
       * the phone never passes through the browser or the model — and the
       * confirmation count it demands is read from its own dry run rather than
       * guessed, which is what makes "one customer" verifiably one.
       */
      const body = {
        filter: { ...EMPTY_FILTER, requirePhone: true },
        customerKeys: [input.customerKey],
        message: input.imageUrl
          ? { type: "image", text: withLink(input), mediaUrl: input.imageUrl }
          : { type: "text", text: withLink(input) },
      };

      const dry = await fetch("/api/whatsapp/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());

      if (!dry?.deliverable) {
        throw new Error(
          "That customer is not reachable on WhatsApp — no usable number, or they have opted out.",
        );
      }

      return {
        url: "/api/whatsapp/broadcast",
        method: "POST",
        body: { ...body, confirm: dry.deliverable },
        done: "Message sent.",
      };
    }
    case "propose_flow_status":
      return {
        url: `/api/whatsapp/flows/${input.flowId}`,
        method: "PATCH",
        body: { status: input.status },
        done: "The flow was updated.",
      };
    default:
      return null;
  }
}

/** The buy link belongs in the body; WhatsApp has no separate link field. */
function withLink(input: Record<string, never>): string {
  const text = String(input.text ?? "");
  const url = input.productUrl ? String(input.productUrl) : "";
  return url && !text.includes(url) ? `${text}\n\n${url}` : text;
}

/**
 * The audience filter that matches nobody on its own.
 *
 * Paired with customerKeys it narrows to exactly those people — the keys are a
 * restriction on the filter, never a replacement for it, so an unreachable or
 * opted-out customer is still excluded.
 */
const EMPTY_FILTER = {
  segments: [], tiers: [], recencyMin: null, recencyMax: null,
  minSpend: null, minOrders: null, churnRiskMin: null, countries: [],
  accountType: "any", boughtProduct: "", requireEmail: false, requirePhone: true,
};

function readable(tool: string): string {
  return tool.replace(/^get_/, "").replace(/_/g, " ");
}

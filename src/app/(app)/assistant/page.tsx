"use client";

import {
  Check,
  Loader2,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentTitle } from "@/components/ui/attachment";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";

/**
 * The assistant.
 *
 * It reads the store and proposes actions; it never performs one. A proposal
 * arrives as a card with an Approve button, and approving calls the ordinary
 * endpoint for that action — the same one the corresponding screen calls, with
 * the same guards. Nothing on this page is a shortcut around those.
 */

interface Proposal {
  id: string;
  tool: string;
  input: Record<string, unknown>;
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
  /** Set once a proposal on this turn has been dealt with. */
  settled?: Record<string, "approved" | "rejected">;
}

const SUGGESTIONS = [
  "How did revenue do this month against last?",
  "Which customers are about to churn, and what are they worth?",
  "What is about to run out of stock?",
  "Write a win-back message and tell me how many it would reach",
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
    }
  };

  /**
   * Carries out an approved proposal.
   *
   * Each maps to the endpoint the matching screen uses. The model's arguments
   * are passed through unchanged, so what was shown on the card is what runs.
   */
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
    <div className="grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-3 xl:grid-cols-4">
      <Card className="flex min-h-0 flex-col lg:col-span-2 xl:col-span-3">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-muted-foreground" />
            Assistant
          </CardTitle>
          <CardDescription className="text-xs">
            Reads your store and drafts messages. It proposes; you approve. It cannot
            send to an audience.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <MessageScrollerProvider>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-4 pb-2">
                {turns.length === 0 ? (
                  <MessageScrollerItem>
                    <div className="space-y-2 py-6">
                      <p className="text-sm text-muted-foreground">
                        Ask about the store, or ask for a message to be written.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTIONS.map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            className="h-auto py-1.5 text-left text-[11px] whitespace-normal"
                            onClick={() => void ask(s)}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </MessageScrollerItem>
                ) : null}

                {turns.map((turn, i) => (
                  <MessageScrollerItem key={i} scrollAnchor={i === turns.length - 1}>
                    <Message align={turn.role === "user" ? "end" : "start"}>
                      <MessageContent>
                        <BubbleGroup>
                          {turn.toolsUsed?.length ? (
                            <div className="mb-1.5 flex flex-wrap gap-1">
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
                              <BubbleContent className="whitespace-pre-wrap">
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
                    <Marker>
                      <MarkerIcon>
                        <Loader2 className="size-3 animate-spin" />
                      </MarkerIcon>
                      <MarkerContent>Reading your store…</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
          </MessageScrollerProvider>

          <div className="flex shrink-0 items-end gap-2">
            <Textarea
              ref={box}
              rows={2}
              value={draft}
              disabled={thinking}
              placeholder="Ask about revenue, customers, stock — or ask for a message"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(draft);
                }
              }}
            />
            <Button
              className="gap-1.5"
              disabled={thinking || draft.trim().length === 0}
              onClick={() => void ask(draft)}
            >
              {thinking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Ask
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="size-4 text-muted-foreground" />
            What it may do
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[11px] leading-relaxed text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Reads, freely</p>
            <p>
              Revenue and KPIs, customer segments, top customers, products, stock risk,
              audience sizes, your flows, the menu bot, and the gateway&apos;s status.
              All from the same cached snapshot the dashboards use, so it cannot quote a
              number the screens disagree with.
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">Proposes, never performs</p>
            <p>
              Sending a test message, turning the menu bot on or off, starting or pausing
              a flow, rewriting the menu. Each arrives as a card you approve, and
              approving calls the same endpoint the matching screen calls.
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">Cannot broadcast</p>
            <p>
              There is no tool for sending to an audience, however it is asked. That
              starts from Campaigns, by a person, behind a typed confirmation.
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">Never sees a phone number</p>
            <p>
              Numbers and email addresses are not in anything it can read, so they cannot
              appear in a reply.
            </p>
          </div>
        </CardContent>
      </Card>
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
    <Attachment className="w-full max-w-full">
      <AttachmentContent>
        <AttachmentTitle className="flex items-center gap-1.5">
          <MessageSquare className="size-3.5" />
          {described.title}
        </AttachmentTitle>
        <AttachmentDescription className="whitespace-pre-wrap">
          {described.detail}
        </AttachmentDescription>

        {outcome ? (
          <p className="mt-1.5 text-[11px] font-medium">
            {outcome === "approved" ? "Approved and carried out." : "Rejected. Nothing happened."}
          </p>
        ) : (
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" className="h-7 gap-1 px-2 text-[11px]" disabled={busy} onClick={onApprove}>
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" disabled={busy} onClick={onReject}>
              <X className="size-3" />
              Reject
            </Button>
          </div>
        )}
      </AttachmentContent>
    </Attachment>
  );
}

/** Plain English for the approval card. A card nobody reads is not a safeguard. */
function describe(p: Proposal): { title: string; detail: string } {
  const input = p.input as Record<string, string | boolean | undefined>;

  switch (p.tool) {
    case "propose_test_message":
      return {
        title: `Send a test message to ${input.phone ?? "a number"}`,
        detail: `${String(input.text ?? "")}${input.imageUrl ? `\n\n[image: ${input.imageUrl}]` : ""}`,
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
 * The menu endpoint replaces the whole menu, so a proposal that only changes
 * one part of it is merged onto what is currently saved. Sending the fragment
 * alone would either be rejected as incomplete or, worse, wipe the parts the
 * proposal did not mention.
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

function readable(tool: string): string {
  return tool.replace(/^get_/, "").replace(/_/g, " ");
}

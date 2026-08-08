"use client";

import { Loader2, MessageCircle, Package, Search, Send, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/dashboard/page-state";
import { ProductPicker, type PickedProduct } from "@/components/whatsapp/product-picker";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Card } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { TextArea } from "@heroui/react";
import { formatCurrency } from "@/lib/format";

interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
  lastMessage?: string;
  customerName: string | null;
  customerKey: string | null;
  orders: number | null;
  spend: number | null;
}

interface Message {
  id: string;
  body: string;
  type: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status: string | null;
}

/**
 * WhatsApp inbox.
 *
 * Conversations on the left, the thread on the right, and a composer that can
 * send text, media or a product from the store catalogue. It exists so a reply
 * to a campaign does not have to be answered on someone's phone, away from any
 * record of what that customer has bought.
 */
export default function InboxPage() {
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [draft, setDraft] = useState("");
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [search, setSearch] = useState("");

  const bottom = useRef<HTMLDivElement | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/chats", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not load conversations.");
        setChats([]);
        return;
      }
      setError(null);
      setChats(body.chats ?? []);
    } catch {
      setError("Could not reach the gateway.");
      setChats([]);
    }
  }, []);

  const loadThread = useCallback(async (chatId: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/whatsapp/chats/${encodeURIComponent(chatId)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      setMessages(res.ok ? (body.messages ?? []) : []);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChats();
    const interval = setInterval(() => void loadChats(), 30_000);
    return () => clearInterval(interval);
  }, [loadChats]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    const run = () => {
      if (!cancelled) void loadThread(activeId);
    };

    /*
     * The first load is deferred by a tick rather than called here directly.
     * loadThread sets state before it awaits, and doing that synchronously in
     * an effect body causes a cascading render — the behaviour is identical,
     * the render is not.
     *
     * Incoming replies arrive without warning, so the open thread then polls.
     */
    const initial = setTimeout(run, 0);
    const interval = setInterval(run, 12_000);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [activeId, loadThread]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const target = activeId ?? newNumber.trim();
    if (!target) return;

    // A product becomes an image with the buy link under it, which is the
    // nearest thing WhatsApp offers a self-hosted sender to a product card.
    const body = product
      ? `${draft.trim()}${draft.trim() ? "\n\n" : ""}${product.name}\n${product.url}`.trim()
      : draft.trim();
    const media = product?.image || mediaUrl.trim();

    if (!body) return;

    setSending(true);
    try {
      const res = await fetch(`/api/whatsapp/chats/${encodeURIComponent(target)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: media ? "image" : "text",
          text: body,
          ...(media ? { mediaUrl: media } : {}),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? "The message could not be sent.");
        return;
      }
      setDraft("");
      setProduct(null);
      setMediaUrl("");
      toast.success("Sent.");
      if (activeId) void loadThread(activeId);
      else {
        await loadChats();
        setNewNumber("");
      }
    } finally {
      setSending(false);
    }
  };

  const visible = (chats ?? []).filter((c) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      (c.customerName ?? "").toLowerCase().includes(needle) ||
      c.id.toLowerCase().includes(needle) ||
      (c.name ?? "").toLowerCase().includes(needle)
    );
  });

  const active = chats?.find((c) => c.id === activeId) ?? null;

  return (
    <PageShell>
      {error ? (
        <Card>
          <Card.Header>
            <Card.Title className="text-sm font-semibold">Inbox unavailable</Card.Title>
            <Card.Description className="text-xs">{error}</Card.Description>
          </Card.Header>
          <Card.Content>
            <Link href="/settings">Check the WhatsApp gateway</Link>
          </Card.Content>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* --- Conversations ------------------------------------------------ */}
        <Card className="lg:h-[calc(100vh-11rem)]">
          <Card.Header className="pb-3">
            <Card.Title className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4 text-muted-foreground" />
              Conversations
            </Card.Title>
            <div className="relative pt-1">
              <Search className="absolute left-2 top-3.5 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </Card.Header>

          <Card.Content className="space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-17rem)]">
            {chats === null ? (
              <p className="flex items-center gap-1.5 p-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Loading…
              </p>
            ) : visible.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">
                No conversations yet. Send a campaign or start one below.
              </p>
            ) : (
              visible.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setActiveId(chat.id)}
                  className={`flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted ${
                    activeId === chat.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground/10">
                    <UserRound className="size-4 text-muted-foreground" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium">
                        {chat.customerName ?? chat.id.split("@")[0]}
                      </span>
                      {chat.unreadCount > 0 ? (
                        <Chip color="accent" className="h-4 px-1 text-[10px]">
                          {chat.unreadCount}
                        </Chip>
                      ) : null}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {chat.lastMessage ?? chat.id.split("@")[0]}
                    </span>
                    {chat.orders !== null ? (
                      <span className="block text-[10px] text-muted-foreground">
                        {chat.orders} orders · {formatCurrency(chat.spend ?? 0, "INR")}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </Card.Content>
        </Card>

        {/* --- Thread ------------------------------------------------------- */}
        <Card className="flex flex-col lg:h-[calc(100vh-11rem)]">
          <Card.Header className="pb-3">
            {active ? (
              <>
                <Card.Title className="text-sm font-semibold">
                  {active.customerName ?? active.id.split("@")[0]}
                </Card.Title>
                <Card.Description className="text-xs">
                  {active.id.split("@")[0]}
                  {active.customerKey ? (
                    <>
                      {" · "}
                      <Link
                        href={`/customers/${encodeURIComponent(active.customerKey)}`}
                        className="underline"
                      >
                        View customer
                      </Link>
                    </>
                  ) : null}
                </Card.Description>
              </>
            ) : (
              <>
                <Card.Title className="text-sm font-semibold">New message</Card.Title>
                <Card.Description className="text-xs">
                  Pick a conversation, or type a number to start one.
                </Card.Description>
              </>
            )}
          </Card.Header>

          <Card.Content className="flex min-h-0 flex-1 flex-col gap-3">
            {active ? (
              <div className="min-h-40 flex-1 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                {loadingThread && messages.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Loading…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No messages in this conversation.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap ${
                          m.direction === "outgoing"
                            ? "bg-foreground text-background"
                            : "bg-background border"
                        }`}
                      >
                        {m.body || <em className="opacity-60">({m.type})</em>}
                        <span className="mt-0.5 block text-[10px] opacity-60">
                          {new Date(m.timestamp * 1000).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottom} />
              </div>
            ) : (
              <Input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="Phone number, e.g. +91 98765 43210"
              />
            )}

            {/* --- Composer -------------------------------------------------- */}
            <div className="space-y-2">
              <ProductPicker selected={product} onSelect={setProduct} disabled={sending} />

              {!product ? (
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Image or video URL (optional)"
                  className="text-xs"
                />
              ) : null}

              <TextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder={
                  product
                    ? "Say something about this product — its name and link are added below automatically."
                    : "Type a message…"
                }
              />

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {product ? (
                    <span className="flex items-center gap-1">
                      <Package className="size-3" />
                      Sends as a photo with the buy link underneath.
                    </span>
                  ) : (
                    "Replies here are one-to-one and skip the campaign machinery, but the opt-out list still applies."
                  )}
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={send}
                  isDisabled={sending || (!activeId && !newNumber.trim()) || (!draft.trim() && !product)}
                  className="shrink-0 gap-1.5"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </PageShell>
  );
}

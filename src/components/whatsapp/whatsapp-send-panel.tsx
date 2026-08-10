"use client";

import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldAlert,
  Square,
  TriangleAlert,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Card } from "@heroui/react";
import { Input } from "@heroui/react";
import { Label } from "@heroui/react";
import { Separator } from "@heroui/react";
import { TextArea } from "@heroui/react";
import { EMPTY_AUDIENCE, type AudienceFilter } from "@/lib/audience";
import { MESSAGE_TEMPLATES, VARIABLE_HELP } from "@/lib/whatsapp/templates";
import { ProductPicker, type PickedProduct } from "@/components/whatsapp/product-picker";

interface Preview {
  matched: number;
  deliverable: number;
  skipped: { noPhone: number; unparseable: number; optedOut: number; duplicate: number };
  sample: string[];
  preview: string | null;
  /** The photo the first recipient would receive, resolved as the send does. */
  media: string | null;
  estimatedMs: number;
  delayBetweenMessagesMs: number;
}

interface Coupon {
  id: number;
  code: string;
  discountType: string;
  amount: string;
  usable: boolean;
  reason: string | null;
  expires: string | null;
}

/** "10% off" or "₹150 off", which is what a customer needs to read. */
function couponValue(coupon: Coupon): string {
  const amount = Number(coupon.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "a discount";
  return coupon.discountType === "percent"
    ? `${amount % 1 === 0 ? amount : amount.toFixed(1)}% off`
    : `₹${Math.round(amount)} off`;
}

interface Progress {
  id: string;
  status: "sending" | "paused" | "completed" | "cancelled" | "failed";
  total: number;
  handedOff: number;
  remaining: number;
  percent: number;
  error: string | null;
  estimatedMsRemaining: number;
  waiting?: boolean;
  retryAfterMs?: number;
}

/**
 * Sends the current audience a WhatsApp message.
 *
 * The order of the controls is the safety model: you cannot reach the send
 * button without first resolving the real recipient list, and the confirmation
 * requires typing the count you were shown. A test send is available throughout
 * and only ever goes to a number typed by hand, so a template can be checked
 * without touching the customer base.
 */
export function WhatsAppSendPanel({
  filter,
  range,
  audienceSize,
  allCustomers = [],
  className,
}: {
  filter: AudienceFilter;
  range?: { from: string; to: string };
  audienceSize: number;
  /** Every customer in range, for picking specific recipients. */
  allCustomers?: { key: string; name: string; email: string; orders: number }[];
  /** Lets the page place this in its grid. */
  className?: string;
}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  const [type, setType] = useState<"text" | "image" | "video">("text");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [useProductImage, setUseProductImage] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [audienceMode, setAudienceMode] = useState<"filtered" | "everyone" | "picked">("filtered");
  const [picked, setPicked] = useState<string[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ amount: "10", type: "percent", days: "30" });

  const [previewState, setPreviewState] = useState<{ sig: string; data: Preview } | null>(null);
  const [confirmValue, setConfirmValue] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const [busy, setBusy] = useState<null | "preview" | "test" | "start">(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Readiness is re-checked, not read once.
   *
   * A WhatsApp session can be linked, drop and be relinked while this page
   * stays open, so a single check on mount goes stale and the panel sits there
   * claiming "Not linked" long after it is. Polling on an interval and on
   * refocus keeps what the panel says about sending true.
   */
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/whatsapp/settings", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        setConnected(Boolean(body.connected));
        setReady(Boolean(body.ready));
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    void check();
    const interval = setInterval(() => void check(), 20_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const coupon = coupons?.find((c) => c.code === couponCode) ?? null;

  /*
   * Who the send addresses.
   *
   * "Everyone" drops the filters rather than reusing whatever happens to be on
   * screen, because "send to all customers" should not silently inherit a
   * churn-risk filter somebody set ten minutes ago. Picked customers narrow the
   * current filter rather than replacing it, so an unreachable or opted-out
   * choice is still excluded server-side.
   */
  const effectiveFilter =
    audienceMode === "everyone" ? { ...EMPTY_AUDIENCE, requirePhone: true } : filter;
  const customerKeys = audienceMode === "picked" ? picked : undefined;

  const targetCount =
    audienceMode === "everyone"
      ? allCustomers.length
      : audienceMode === "picked"
        ? picked.length
        : audienceSize;

  const matchingCustomers = customerQuery.trim()
    ? allCustomers.filter((c) => {
        const needle = customerQuery.toLowerCase();
        return c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle);
      })
    : allCustomers;

  const message = {
    type,
    text,
    /*
     * An empty media URL is omitted rather than sent as "". The schema validates
     * it as a URL, so an empty string came back as "Invalid URL" — which is what
     * happened whenever a campaign product supplied the photo and this field was
     * left blank, the ordinary case.
     */
    ...(type === "text"
      ? {}
      : useProductImage
        ? { useProductImage: true }
        : mediaUrl.trim()
          ? { mediaUrl: mediaUrl.trim() }
          : {}),
    ...(coupon ? { coupon: { code: coupon.code, value: couponValue(coupon) } } : {}),
    ...(product
      ? {
          product: {
            name: product.name,
            url: product.url,
            image: product.image,
            category: product.category,
          },
        }
      : {}),
  };

  /*
   * Any change to the audience or the message invalidates the preview, because
   * the confirmation has to refer to the list actually about to be sent. This
   * is derived rather than reset in an effect, so there is no render where a
   * stale count is on screen next to a live send button.
   */
  const signature = JSON.stringify({
    filter: effectiveFilter, range, type, text, mediaUrl, useProductImage, couponCode,
    productId: product?.id ?? null, customerKeys,
  });
  const preview = previewState?.sig === signature ? previewState.data : null;
  const applyTemplate = (id: string) => {
    const template = MESSAGE_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setTemplateId(id);
    setText(template.body);

    /*
     * A campaign-product template draws {{product_url}} and its photo from the
     * picker, so it must not also switch on the per-customer photo — that
     * resolved the link against each recipient's own past purchase, and
     * collapsed to no link at all for anyone whose product had left the
     * catalogue. It becomes an image message once a product is chosen.
     */
    if (template.campaignProduct) {
      setUseProductImage(false);
      setType(product?.image ? "image" : "text");
    } else if (template.withImage) {
      setType("image");
      setUseProductImage(true);
    } else {
      setType("text");
      setUseProductImage(false);
    }
  };

  const activeTemplate = MESSAGE_TEMPLATES.find((t) => t.id === templateId) ?? null;

  // A campaign-product template with nothing picked has no link and no photo,
  // so it would send a sentence with a hole where the product should be.
  const needsProduct = Boolean(activeTemplate?.campaignProduct) && !product;

  const composed =
    text.trim().length > 0 &&
    !needsProduct &&
    (type === "text" || useProductImage || Boolean(product?.image) || mediaUrl.trim().length > 0);

  /**
   * Choosing a product with a photo makes this an image message.
   *
   * Leaving the type at "text" silently dropped the photo — the send went out
   * as words with a link, which is not what picking a product means. The
   * checkbox below can still turn it off deliberately.
   */
  const chooseProduct = (next: PickedProduct | null) => {
    setProduct(next);
    if (next?.image) {
      setType("image");
      setUseProductImage(false);
      setMediaUrl("");
    } else if (product?.image && !next) {
      setType("text");
    }
  };

  const runPreview = async () => {
    setBusy("preview");
    try {
      const res = await fetch("/api/whatsapp/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: effectiveFilter, range, customerKeys, message }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The audience could not be resolved.");
        return;
      }
      setPreviewState({ sig: signature, data: body as Preview });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The test message could not be sent.");
        return;
      }
      toast.success(`Test sent to ${testPhone}.`);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/whatsapp/coupons", { cache: "no-store" });
        const body = await res.json();
        setCoupons(res.ok ? (body.coupons ?? []) : []);
      } catch {
        setCoupons([]);
      }
    })();
  }, []);

  /**
   * Creates a coupon in WooCommerce and selects it.
   *
   * Restricted to the campaign product when one is chosen, so a discount meant
   * for a specific item cannot be spent across the whole catalogue.
   */
  const createCoupon = async () => {
    setCreatingCoupon(true);
    try {
      const res = await fetch("/api/whatsapp/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountType: newCoupon.type,
          amount: Number(newCoupon.amount),
          expiresInDays: Number(newCoupon.days) || undefined,
          usageLimitPerUser: 1,
          ...(product ? { productIds: [product.id] } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The coupon could not be created.");
        return;
      }

      const listed = await fetch("/api/whatsapp/coupons", { cache: "no-store" }).then((r) => r.json());
      setCoupons(listed.coupons ?? []);
      setCouponCode(body.coupon.code);
      toast.success(`Coupon ${body.coupon.code} created in WooCommerce.`);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const tick = useCallback((id: string) => {
    const run = async () => {
      try {
        const res = await fetch(`/api/whatsapp/broadcast/${id}`, { method: "POST" });
        const body = (await res.json()) as Progress;
        setProgress(body);

        if (body.status === "sending") {
          // Wait out the batch the gateway is still pacing through rather than
          // hammering it; the server says how long that is.
          const wait = body.waiting ? (body.retryAfterMs ?? 15_000) : 5_000;
          timer.current = setTimeout(run, Math.min(wait, 60_000));
        } else if (body.status === "completed") {
          toast.success("Broadcast complete.");
        } else if (body.status === "failed") {
          toast.error(body.error ?? "The broadcast failed.");
        }
      } catch {
        timer.current = setTimeout(run, 15_000);
      }
    };
    void run();
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const start = async () => {
    if (!preview) return;
    setBusy("start");
    try {
      const res = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: effectiveFilter,
          range,
          customerKeys,
          message,
          confirm: preview.deliverable,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The broadcast could not be started.");
        return;
      }
      setProgress(body as Progress);
      tick(body.id);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!progress) return;
    if (timer.current) clearTimeout(timer.current);
    const res = await fetch(`/api/whatsapp/broadcast/${progress.id}`, { method: "DELETE" });
    setProgress((await res.json()) as Progress);
    toast.info("Broadcast stopped. Messages already handed to the gateway will still go out.");
  };

  if (connected === false) {
    return (
      <Card className={className}>
        <Card.Header>
          <Card.Title className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="size-4 text-muted-foreground" />
            Send on WhatsApp
          </Card.Title>
          <Card.Description className="text-xs">
            No gateway is connected yet.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Link href="/settings">Connect a WhatsApp gateway</Link>
        </Card.Content>
      </Card>
    );
  }

  const running = progress?.status === "sending";

  return (
    <Card className={className}>
      <Card.Header>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Card.Title className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4 text-muted-foreground" />
              Send on WhatsApp
            </Card.Title>
            <Card.Description className="text-xs">
              Goes to {targetCount.toLocaleString()}{" "}
              {audienceMode === "picked"
                ? "chosen customers"
                : audienceMode === "everyone"
                  ? "customers — everyone in range"
                  : "customers matching the filters above"}
              , minus anyone unreachable or opted out.
            </Card.Description>
          </div>
          {!ready ? (
            <Chip color="default" className="shrink-0 gap-1">
              <TriangleAlert className="size-3" />
              Not linked
            </Chip>
          ) : null}
        </div>
      </Card.Header>

      <Card.Content className="space-y-4">
        {!ready ? (
          <Alert>
            <TriangleAlert className="size-4" />
            <Alert.Title className="text-xs font-medium">Session is not ready</Alert.Title>
            <Alert.Description className="text-xs">
              The gateway is connected but no number is linked, so nothing can be sent. Link one
              in <Link href="/settings" className="underline">Settings</Link> — this notice clears
              by itself within a few seconds of the scan landing.
            </Alert.Description>
          </Alert>
        ) : null}

        <div className="space-y-3">
          {/* Who first, then what. The audience is the decision that changes
              the stakes; the message is the one that changes the words. */}
          <div className="space-y-1.5">
            <Label>Send to</Label>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["filtered", `Current filters (${audienceSize.toLocaleString()})`],
                ["everyone", `Everyone (${allCustomers.length.toLocaleString()})`],
                ["picked", picked.length ? `Chosen (${picked.length})` : "Choose customers"],
              ] as const).map(([mode, label]) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={audienceMode === mode ? "primary" : "outline"}
                  onClick={() => setAudienceMode(mode)}
                  isDisabled={running}
                >
                  {label}
                </Button>
              ))}
            </div>
            {audienceMode === "everyone" ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Ignores the filters above deliberately — &ldquo;everyone&rdquo; should not
                quietly inherit a filter set earlier. Anyone unreachable or opted out is
                still excluded.
              </p>
            ) : null}
          </div>

          {audienceMode === "picked" ? (
            <div className="space-y-2 rounded-lg border p-2">
              <div className="flex gap-2">
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search customers by name or email…"
                  className="h-8 text-xs"
                  disabled={running}
                />
                {picked.length ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPicked([])}
                    isDisabled={running}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

              <div className="max-h-52 space-y-0.5 overflow-y-auto">
                {matchingCustomers.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    {customerQuery ? `Nobody matches “${customerQuery}”.` : "No customers in range."}
                  </p>
                ) : (
                  matchingCustomers.slice(0, 200).map((c) => {
                    const on = picked.includes(c.key);
                    return (
                      <label
                        key={c.key}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={running}
                          onChange={() =>
                            setPicked((prev) =>
                              on ? prev.filter((k) => k !== c.key) : [...prev, c.key],
                            )
                          }
                        />
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {c.name || c.email || c.key}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {c.orders} {c.orders === 1 ? "order" : "orders"}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {matchingCustomers.length > 200 ? (
                <p className="text-[11px] text-muted-foreground">
                  Showing the first 200 of {matchingCustomers.length.toLocaleString()}. Narrow
                  the search to reach the rest.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Templates: choosing the intent is the decision, and the message
              type and photo setting follow from it. */}
          <div className="space-y-1.5">
            <Label>Start from a template</Label>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant={templateId === t.id ? "primary" : "outline"}
                  onClick={() => applyTemplate(t.id)}
                  isDisabled={running}
                >
                  {t.name}
                </Button>
              ))}
            </div>
            {needsProduct ? (
              <p className="text-[11px] leading-relaxed text-warning">
                Pick a campaign product above. This template sends that product&apos;s
                photo and its link, so without one the message has a gap where the
                product should be.
              </p>
            ) : null}
            {activeTemplate ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {activeTemplate.purpose}{" "}
                <span className="text-foreground">Best paired with: {activeTemplate.suggestedAudience}.</span>
              </p>
            ) : null}
          </div>

          {/* Coupon and a campaign-wide product: both optional, both feed the
              same {{...}} variables the template already references. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-coupon">Coupon code</Label>
              <select
                id="wa-coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={running}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="">No coupon</option>
                {(coupons ?? []).map((c) => (
                  <option key={c.id} value={c.code} disabled={!c.usable}>
                    {c.code} — {couponValue(c)}
                    {c.usable ? "" : ` (${c.reason})`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Fills <code>{"{{coupon}}"}</code> and <code>{"{{coupon_value}}"}</code>. Codes that
                have expired or hit their usage limit cannot be picked.
              </p>

              <details className="rounded-md border p-2">
                <summary className="cursor-pointer text-[11px] font-medium">
                  Create a new coupon
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1.5">
                    <Input
                      value={newCoupon.amount}
                      onChange={(e) => setNewCoupon({ ...newCoupon, amount: e.target.value })}
                      inputMode="decimal"
                      className="h-8 text-xs"
                      placeholder="10"
                    />
                    <select
                      value={newCoupon.type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                      className="h-8 rounded-md border bg-transparent px-2 text-xs"
                    >
                      <option value="percent">% off</option>
                      <option value="fixed_cart">off cart</option>
                      <option value="fixed_product">off item</option>
                    </select>
                    <Input
                      value={newCoupon.days}
                      onChange={(e) => setNewCoupon({ ...newCoupon, days: e.target.value })}
                      inputMode="numeric"
                      className="h-8 w-20 text-xs"
                      placeholder="days"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={createCoupon}
                    isDisabled={creatingCoupon || running || !Number(newCoupon.amount)}
                    className="w-full gap-1.5"
                  >
                    {creatingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Create in WooCommerce
                  </Button>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Generates a code, limits it to one use per customer, and expires it after
                    the days given.{" "}
                    {product
                      ? `Restricted to ${product.name}, so it cannot be spent elsewhere.`
                      : "Pick a campaign product first to restrict it to that item."}{" "}
                    This writes to your store — the only thing in this app that does.
                  </p>
                </div>
              </details>
            </div>

            <div className="space-y-1.5">
              <Label>Campaign product</Label>
              <ProductPicker selected={product} onSelect={chooseProduct} disabled={running} />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {product?.image
                  ? "Its photo will be attached, with your caption and the buy link beneath."
                  : product
                    ? "This product has no photo in WooCommerce, so it sends as text with the link."
                    : "Optional. Sends everyone this product instead of whatever each customer bought most."}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {(["text", "image", "video"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "primary" : "outline"}
                onClick={() => setType(t)}
                className="capitalize"
                isDisabled={running}
              >
                {t}
              </Button>
            ))}
          </div>

          {type !== "text" ? (
            <div className="space-y-2">
              {type === "image" && product?.image ? (
                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="text-xs font-medium">Sending {product.name}&apos;s photo</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Everyone receives this image with the caption below it. Remove the
                    campaign product to send text instead.
                  </p>
                </div>
              ) : type === "image" ? (
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={useProductImage}
                    onChange={(e) => setUseProductImage(e.target.checked)}
                    disabled={running}
                    className="mt-0.5"
                  />
                  <span>
                    Send each customer their own product photo
                    <span className="block text-[11px] text-muted-foreground">
                      Uses the photo of whatever they have spent the most on. Anyone whose
                      product has no photo still gets the message, as text.
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      Attaching a photo stops WhatsApp drawing its own link preview, so the
                      buy link appears as plain text. Leave this off and the link renders as a
                      tappable card instead — provided your product pages set an{" "}
                      <code>og:image</code> tag. WhatsApp does not offer tappable buttons to
                      self-hosted gateways at all; those need the official Business API.
                    </span>
                  </span>
                </label>
              ) : null}

              {!useProductImage && !product?.image ? (
                <div className="space-y-1.5">
                  <Label htmlFor="wa-media">Media URL</Label>
                  <Input
                    id="wa-media"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://naturesjoystore.com/wp-content/uploads/offer.jpg"
                    disabled={running}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The gateway fetches this itself, so it has to be publicly reachable.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="wa-text">{type === "text" ? "Message" : "Caption"}</Label>
            <TextArea
              id="wa-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={"Hi {{name}}, we saved your favourite Manjistha soap for you..."}
              disabled={running}
            />
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer">Variables you can use</summary>
              <ul className="mt-1.5 space-y-1">
                {VARIABLE_HELP.map((v) => (
                  <li key={v.token} className="flex gap-2">
                    <code className="shrink-0">{v.token}</code>
                    <span>{v.describes}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5">
                Each resolves from that customer&apos;s own orders. A variable with no value
                for someone is removed and the sentence tidied, so nobody receives a literal{" "}
                <code>{"{{product}}"}</code> or a dangling comma.
              </p>
            </details>
          </div>
        </div>

        <Separator />

        {/* Test send: isolated from the audience by design. */}
        <div className="space-y-1.5">
          <Label htmlFor="wa-test">Send a test first</Label>
          <div className="flex gap-2">
            <Input
              id="wa-test"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              disabled={running}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendTest}
              isDisabled={!composed || testPhone.trim().length < 6 || busy !== null || !ready}
              className="shrink-0 gap-1.5"
            >
              {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Test
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Goes only to the number you type here. It cannot reach a customer.
          </p>
        </div>

        <Separator />

        {!preview ? (
          <Button
            type="button"
            variant="outline"
            onClick={runPreview}
            isDisabled={!composed || busy !== null || running}
            className="w-full gap-1.5"
          >
            {busy === "preview" ? <Loader2 className="size-4 animate-spin" /> : null}
            Check who this would reach
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Stat label="In audience" value={preview.matched.toLocaleString()} />
              <Stat label="Reachable" value={preview.deliverable.toLocaleString()} strong />
              <Stat
                label="Dropped"
                value={(
                  preview.skipped.noPhone +
                  preview.skipped.unparseable +
                  preview.skipped.optedOut +
                  preview.skipped.duplicate
                ).toLocaleString()}
              />
              <Stat label="Takes about" value={humanDuration(preview.estimatedMs)} />
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Dropped: {preview.skipped.noPhone.toLocaleString()} with no phone,{" "}
              {preview.skipped.unparseable.toLocaleString()} unreadable,{" "}
              {preview.skipped.duplicate.toLocaleString()} duplicate numbers,{" "}
              {preview.skipped.optedOut.toLocaleString()} opted out.
              {preview.sample.length ? ` Sample: ${preview.sample.join(", ")}.` : ""}
            </p>

            {preview.preview ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  As the first recipient will see it
                </p>
                {/* Shaped like the message itself: the photo on top, the caption
                    under it, which is how WhatsApp renders an image send. */}
                <div className="max-w-[19rem] overflow-hidden rounded-lg rounded-tl-sm border bg-muted">
                  {preview.media ? (
                    <Image
                      unoptimized
                      src={preview.media}
                      alt=""
                      width={304}
                      height={304}
                      className="max-h-56 w-full bg-background object-contain"
                    />
                  ) : null}
                  <p className="whitespace-pre-wrap p-2.5 text-xs">{preview.preview}</p>
                </div>
                {type !== "text" && !preview.media ? (
                  <p className="text-[11px] text-warning">
                    No photo resolved for this recipient, so they receive text only.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {preview && !running && progress?.status !== "completed" ? (
          <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <ShieldAlert className="size-3.5 text-destructive" />
              This sends to {preview.deliverable.toLocaleString()} real customers
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Messages cannot be recalled once delivered. Type{" "}
              <strong>{preview.deliverable}</strong> to confirm.
            </p>
            <div className="flex gap-2">
              <Input
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={String(preview.deliverable)}
                inputMode="numeric"
              />
              <Button
                type="button"
                onClick={start}
                isDisabled={
                  confirmValue.trim() !== String(preview.deliverable) || busy !== null || !ready
                }
                className="shrink-0 gap-1.5"
              >
                {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send broadcast
              </Button>
            </div>
          </div>
        ) : null}

        {progress ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium">
                {progress.status === "completed" ? (
                  <CheckCircle2 className="size-3.5 text-muted-foreground" />
                ) : progress.status === "sending" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <TriangleAlert className="size-3.5" />
                )}
                {progress.handedOff.toLocaleString()} of {progress.total.toLocaleString()} handed to
                the gateway
                {progress.status === "sending" ? ` · ${humanDuration(progress.estimatedMsRemaining)} left` : ""}
              </p>
              {running ? (
                <Button type="button" variant="outline" size="sm" onClick={cancel} className="gap-1.5">
                  <Square className="size-3.5" />
                  Stop
                </Button>
              ) : (
                <Chip color="default" className="capitalize">{progress.status}</Chip>
              )}
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {progress.error ? (
              <p className="text-[11px] text-destructive">{progress.error}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                The gateway paces sends itself. Leaving this page pauses the broadcast — anything
                already handed over still goes out, and reopening resumes where it stopped.
              </p>
            )}
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground">{label}</p>
      <p className={strong ? "text-sm font-semibold tabular-nums" : "tabular-nums"}>{value}</p>
    </div>
  );
}

function humanDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

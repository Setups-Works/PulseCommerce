"use client";

import { Loader2, MessageSquare, Save, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MenuTree } from "@/components/whatsapp/menu-tree";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Card } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@heroui/react";
import { TextArea } from "@heroui/react";
import {
  EMPTY_MENU,
  countOptions,
  moveNode,
  renumber,
  validateMenu,
  type MenuConfig,
  type MenuOption,
  type MenuPath,
} from "@/lib/whatsapp/menu";

/**
 * The inbound menu bot.
 *
 * Everything else in this app sends. This is the one screen that decides what
 * happens when a customer writes first — which is why it says plainly, at the
 * top, whether it is currently answering anybody.
 */
export default function MenuPage() {
  const [menu, setMenu] = useState<MenuConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "toggle">(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/menu", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not read the menu.");
      setMenu({ ...EMPTY_MENU, ...body.menu });
      setEnabled(Boolean(body.enabled));
      setInstalled(body.installed !== false);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not read the menu.");
    }
  }, []);

  useEffect(() => {
    // Deferred a tick so the first state update is not synchronous in the
    // effect body, which causes a cascading render.
    const start = setTimeout(() => void load(), 0);
    return () => clearTimeout(start);
  }, [load]);

  const problems = menu ? validateMenu(menu) : [];

  const save = async (nextEnabled?: boolean) => {
    if (!menu) return;
    setBusy(typeof nextEnabled === "boolean" ? "toggle" : "save");

    try {
      const res = await fetch("/api/whatsapp/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...menu,
          options: renumber(menu.options),
          ...(typeof nextEnabled === "boolean" ? { enabled: nextEnabled } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save the menu.");

      if (typeof nextEnabled === "boolean") setEnabled(nextEnabled);
      toast.success(
        nextEnabled === true
          ? "The menu is answering customers now."
          : nextEnabled === false
            ? "The menu is off. Nobody receives an automatic reply."
            : "Saved. The next customer to message gets this menu.",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the menu.");
    } finally {
      setBusy(null);
    }
  };

  const move = (from: MenuPath, toParent: MenuPath, toIndex: number) => {
    if (!menu) return;
    setMenu({ ...menu, options: renumber(moveNode(menu.options, from, toParent, toIndex)) });
  };

  const setOptions = (options: MenuOption[]) => {
    if (!menu) return;
    setMenu({ ...menu, options: renumber(options) });
  };

  if (loadError) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <Card.Title className="text-sm">The menu could not be loaded</Card.Title>
        <Card.Description className="text-xs">{loadError}</Card.Description>
      </Card>
    );
  }

  if (!menu) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading the menu…</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
      <Card className="lg:col-span-2 xl:col-span-3">
        <Card.Header>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Card.Title className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4 text-muted-foreground" />
                Automatic reply
                <Chip variant={enabled ? "primary" : "soft"}>
                  {enabled ? "Answering customers" : "Off"}
                </Chip>
              </Card.Title>
              <Card.Description className="text-xs">
                What a customer receives when they message you first. It runs on the
                gateway, so it answers at three in the morning whether or not anything
                else is running.
              </Card.Description>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                isDisabled={busy !== null || problems.length > 0}
                onClick={() => save()}
              >
                {busy === "save" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </Button>
              <Button
                variant={enabled ? "outline" : "primary"}
                isDisabled={busy !== null || (!enabled && problems.length > 0)}
                onClick={() => save(!enabled)}
              >
                {busy === "toggle" ? <Loader2 className="size-4 animate-spin" /> : null}
                {enabled ? "Turn off" : "Turn on"}
              </Button>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="space-y-4">
          {!installed ? (
            <Alert>
              The menu extension is not installed on your gateway, so nothing here can
              answer yet. Install <code>chat-flow</code> from the gateway&apos;s plugin
              catalogue first.
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="menu-trigger">Trigger word</Label>
              <Input
                id="menu-trigger"
                value={menu.trigger}
                placeholder="hi"
                onChange={(e) => setMenu({ ...menu, trigger: e.target.value })}
              />
              {menu.trigger.trim() ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Matched exactly, ignoring case. &ldquo;{menu.trigger.trim()}&rdquo; opens the
                  menu; anything else is left for a person to answer.
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-warning">
                  Empty means <b>every</b> message opens the menu, so every customer who
                  writes gets a menu instead of a person. Set a word unless you truly
                  want that.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Group chats</Label>
              <Button
                type="button"
                variant={menu.respondInGroups ? "primary" : "outline"}
                size="sm"
                onClick={() => setMenu({ ...menu, respondInGroups: !menu.respondInGroups })}
              >
                {menu.respondInGroups ? "Also replies in groups" : "Direct chats only"}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                In a group, every participant walks their own menu. Usually not wanted.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-greeting">Greeting</Label>
            <TextArea
              id="menu-greeting"
              rows={4}
              value={menu.greeting}
              placeholder={"Hello! Reply with a number:\n\n1  Order\n2  Contact us\n3  Feedback"}
              onChange={(e) => setMenu({ ...menu, greeting: e.target.value })}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Sent the moment the trigger word arrives. List the numbers here — the
              options below are what each one replies with.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Menu options</Label>
              <span className="text-[11px] text-muted-foreground">
                {countOptions(menu.options)} in total · drag to reorder or nest
              </span>
            </div>
            <MenuTree
              options={menu.options}
              onChange={setOptions}
              onMove={move}
              disabled={busy !== null}
            />
          </div>

          {problems.length > 0 ? (
            <Alert>
              <ul className="list-inside list-disc space-y-0.5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
        </Card.Content>
      </Card>

      <Card className="lg:col-span-1">
        <Card.Header>
          <Card.Title className="text-sm font-semibold">What the customer sees</Card.Title>
          <Card.Description className="text-xs">
            The greeting, then whichever option they choose.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-2">
          <Bubble side="out">{menu.trigger.trim() || "(any message)"}</Bubble>
          <Bubble side="in">{menu.greeting || "…your greeting appears here"}</Bubble>
          {menu.options.slice(0, 3).map((o) => (
            <div key={o.key} className="space-y-1.5 pt-1">
              <Bubble side="out">{o.key}</Bubble>
              <Bubble side="in">{o.text || "…this option has no reply yet"}</Bubble>
            </div>
          ))}
          {menu.options.length > 3 ? (
            <p className="pt-1 text-[11px] text-muted-foreground">
              …and {menu.options.length - 3} more option
              {menu.options.length - 3 === 1 ? "" : "s"}.
            </p>
          ) : null}

          <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
            A conversation forgets where it is after fifteen minutes, so a stray number
            the next day is never read as a menu choice.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-2.5 text-[11px] leading-relaxed">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
      <div>{children}</div>
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  return (
    <div className={side === "out" ? "flex justify-end" : "flex justify-start"}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-xs ${
          side === "out"
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

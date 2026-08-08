"use client";

import { Loader2, Pause, Play, Plus, Trash2, Workflow } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Card } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@heroui/react";
import { TextArea } from "@heroui/react";
import { AUDIENCE_PRESETS } from "@/lib/audience";
import { MESSAGE_TEMPLATES } from "@/lib/whatsapp/templates";

interface FlowSummary {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
  steps: number;
  exitOn: "none" | "ordered";
  active: number;
  testPhone: string | null;
  stats: { enrolled: number; sent: number; completed: number; exited: number; failed: number };
  lastTickAt: string | null;
  nextDueAt: string | null;
}

interface DraftStep {
  waitDays: string;
  text: string;
}

/**
 * Multi-step campaigns.
 *
 * A broadcast is one message, now. A flow waits: enter an audience, wait, send,
 * wait, send, and leave early if the customer does the thing the flow was for.
 * Nothing on this page sends anything — a flow is created as a draft, and only
 * starts when it is deliberately activated.
 */
export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState(AUDIENCE_PRESETS[0]?.id ?? "");
  const [exitOn, setExitOn] = useState<"none" | "ordered">("ordered");
  const [testPhone, setTestPhone] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([{ waitDays: "0", text: "" }]);

  const preset = AUDIENCE_PRESETS.find((p) => p.id === presetId) ?? null;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/flows", { cache: "no-store" });
      const body = await res.json();
      setFlows(body.flows ?? []);
    } catch {
      setFlows([]);
    }
  }, []);

  useEffect(() => {
    // Deferred by a tick so the first state update does not happen synchronously
    // in the effect body, which causes a cascading render.
    const start = setTimeout(() => void load(), 0);
    return () => clearTimeout(start);
  }, [load]);

  const create = async () => {
    if (!preset) return;
    setBusy("create");

    try {
      const res = await fetch("/api/whatsapp/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          entry: preset.filter,
          exitOn,
          ...(testPhone.trim() ? { testPhone: testPhone.trim() } : {}),
          steps: steps.map((s) => ({
            waitDays: Number(s.waitDays) || 0,
            message: { type: "text", text: s.text },
          })),
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create the flow.");

      toast.success("Flow created as a draft. It sends nothing until you start it.");
      setName("");
      setSteps([{ waitDays: "0", text: "" }]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the flow.");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (id: string, status: FlowSummary["status"]) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/whatsapp/flows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not update the flow.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the flow.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (flow: FlowSummary) => {
    // Deleting discards who has already been messaged, so a recreated flow
    // would start everyone again from step one. Pausing is the reversible move.
    const ok = window.confirm(
      `Delete "${flow.name}"? This forgets who has already been messaged, so recreating it would start everyone from step one. Pausing keeps that record.`,
    );
    if (!ok) return;

    setBusy(flow.id);
    try {
      await fetch(`/api/whatsapp/flows/${flow.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const valid =
    name.trim().length > 0 && steps.length > 0 && steps.every((s) => s.text.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="text-sm font-semibold">Build a flow</Card.Title>
            <Card.Description className="text-xs">
              Steps send in order, each waiting the given number of days after the one
              before it. Created as a draft — nothing sends until you start it.
            </Card.Description>
          </Card.Header>

          <Card.Content className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="flow-name">Name</Label>
              <Input
                id="flow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Win-back over two weeks"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Who enters</Label>
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCE_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={presetId === p.id ? "primary" : "outline"}
                    onClick={() => setPresetId(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              {preset ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {preset.rationale}
                </p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Checked on every run, so customers join as they start matching — a flow
                keeps working rather than sending once to whoever matched today.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Steps</Label>
              {steps.map((step, i) => (
                <div key={i} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Step {i + 1}</span>
                    {steps.length > 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      className="w-20"
                      value={step.waitDays}
                      onChange={(e) =>
                        setSteps(
                          steps.map((s, j) => (j === i ? { ...s, waitDays: e.target.value } : s)),
                        )
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {i === 0 ? "days after joining" : "days after the previous step"}
                    </span>
                  </div>

                  <TextArea
                    rows={3}
                    value={step.text}
                    placeholder="Hi {{name}}, ..."
                    onChange={(e) =>
                      setSteps(steps.map((s, j) => (j === i ? { ...s, text: e.target.value } : s)))
                    }
                  />

                  <div className="flex flex-wrap gap-1">
                    {MESSAGE_TEMPLATES.filter((t) => !t.campaignProduct)
                      .slice(0, 4)
                      .map((t) => (
                        <Button
                          key={t.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={() =>
                            setSteps(
                              steps.map((s, j) => (j === i ? { ...s, text: t.body } : s)),
                            )
                          }
                        >
                          {t.name}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                isDisabled={steps.length >= 10}
                onClick={() => setSteps([...steps, { waitDays: "3", text: "" }])}
              >
                <Plus className="size-4" />
                Add a step
              </Button>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="flow-test">Send only to this number (optional)</Label>
              <Input
                id="flow-test"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="6383984698"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Fill this in and the flow ignores the audience above entirely — every
                step goes to this one number. It is the way to check the sequence, the
                timing and the wording without messaging a customer.
              </p>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Leave the flow early</Label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={exitOn === "ordered" ? "primary" : "outline"}
                  onClick={() => setExitOn("ordered")}
                >
                  When they order
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={exitOn === "none" ? "primary" : "outline"}
                  onClick={() => setExitOn("none")}
                >
                  Never
                </Button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                A win-back sequence that keeps nagging someone who already came back is
                worse than not running at all.
              </p>
            </div>

            <Button className="w-full gap-1.5" isDisabled={!valid || busy !== null} onClick={create}>
              {busy === "create" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Workflow className="size-4" />
              )}
              Create as draft
            </Button>
          </Card.Content>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Your flows</Card.Title>
              <Card.Description className="text-xs">
                Active flows are advanced once a day, at 10:00 IST — so a step is sent on
                the first run after it comes due, not the minute it does. A missed run
                delays a step; it cannot lose one or send it twice.
              </Card.Description>
            </Card.Header>

            <Card.Content className="space-y-3">
              {flows === null ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              ) : flows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No flows yet. Build one on the left — it starts as a draft and sends
                  nothing until you start it.
                </p>
              ) : (
                flows.map((flow) => (
                  <div key={flow.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{flow.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {flow.steps} step{flow.steps === 1 ? "" : "s"} ·{" "}
                          {flow.testPhone
                            ? `test flow — only ${flow.testPhone}`
                            : flow.exitOn === "ordered"
                              ? "exits when they order"
                              : "no early exit"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {flow.testPhone ? <Chip color="default">Test</Chip> : null}
                        <Chip
                          variant={
                            flow.status === "active"
                              ? "secondary"
                              : flow.status === "paused"
                                ? "secondary" : "soft"
                          }
                        >
                          {flow.status}
                        </Chip>

                        {flow.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            isDisabled={busy === flow.id}
                            onClick={() => setStatus(flow.id, "paused")}
                          >
                            <Pause className="size-3.5" />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            isDisabled={busy === flow.id}
                            onClick={() => setStatus(flow.id, "active")}
                          >
                            <Play className="size-3.5" />
                            Start
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={busy === flow.id}
                          onClick={() => remove(flow)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                      <Stat label="In flight" value={flow.active} />
                      <Stat label="Enrolled" value={flow.stats.enrolled} />
                      <Stat label="Sent" value={flow.stats.sent} />
                      <Stat label="Finished" value={flow.stats.completed} />
                      <Stat label="Left early" value={flow.stats.exited} />
                    </div>

                    {flow.stats.failed > 0 ? (
                      <p className="text-[11px] text-warning">
                        {flow.stats.failed} send
                        {flow.stats.failed === 1 ? "" : "s"} failed and will be retried on the
                        next run.
                      </p>
                    ) : null}

                    <p className="text-[11px] text-muted-foreground">
                      {flow.nextDueAt
                        ? `Next step due ${new Date(flow.nextDueAt).toLocaleString("en-GB")}.`
                        : "Nothing waiting."}{" "}
                      {flow.lastTickAt
                        ? `Last run ${new Date(flow.lastTickAt).toLocaleString("en-GB")}.`
                        : "Not run yet."}
                    </p>
                  </div>
                ))
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

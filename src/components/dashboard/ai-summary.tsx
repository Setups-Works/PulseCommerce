"use client";

import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * A plain-English read of whatever page it sits on.
 *
 * Asked for on a button rather than run on page load, deliberately. Every
 * summary is a model call against a metered key, and a dashboard that silently
 * spends quota each time someone glances at it exhausts the daily allowance by
 * mid-morning — the operator then finds the assistant unavailable when they
 * actually want it. Pressing a button is one click; running always is a cost
 * nobody chose.
 *
 * It answers from the same tools the assistant uses, so a summary here cannot
 * disagree with the figures above it.
 */
export function AiSummary({
  question,
  label = "Summarise this page",
}: {
  /** What to ask. Written per page, so the answer is about what is on screen. */
  question: string;
  label?: string;
}) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The summary could not be produced.");
      setAnswer(body.message || "No summary came back.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The summary could not be produced.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-0 border-primary/25 bg-primary/[0.03] p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-3.5 text-primary" />
        </span>

        <div className="min-w-0 flex-1">
          {answer ? (
            <>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{answer}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => void run()} disabled={busy}>
                  Ask again
                </Button>
                <Link
                  href="/assistant"
                  className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                >
                  Ask a follow-up
                  <ChevronRight className="size-3" />
                </Link>
              </div>
            </>
          ) : error ? (
            <>
              <p className="text-[13px] text-muted-foreground">{error}</p>
              <Button size="sm" variant="ghost" className="mt-1 h-6 px-2 text-[11px]" onClick={() => void run()} disabled={busy}>
                Try again
              </Button>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] text-muted-foreground">
                Have this page read back to you in plain English.
              </p>
              <Button size="sm" className="h-7 gap-1.5 px-2.5 text-[11px]" onClick={() => void run()} disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {busy ? "Reading…" : label}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

"use client";

import { Loader2, Send, ListChecks } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CloudMessageTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
}

/**
 * PUL-16 pilot: a minimal, real exercise of the Meta WhatsApp Cloud API,
 * against the temporary test business number from the App Dashboard's own
 * API Setup page — not the merchant-facing send path (that's PUL-18) and
 * not reachable from the main sidebar nav. Exists so App Review's
 * screencast requirement has a genuine, working flow to record: a real
 * send via whatsapp_business_messaging, and a real template list via
 * whatsapp_business_management.
 */
export default function WhatsAppCloudPilotPage() {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("Hello from the PulseCommerce Cloud API pilot.");
  const [sending, setSending] = useState(false);

  const [templates, setTemplates] = useState<CloudMessageTemplate[] | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const sendTest = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp-cloud/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "The send failed.");
        return;
      }
      toast.success(`Sent — message id ${body.messageId}`);
    } finally {
      setSending(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/whatsapp-cloud/templates", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Could not list templates.");
        return;
      }
      setTemplates(body.templates);
    } finally {
      setLoadingTemplates(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4" /> Send a test message
          </CardTitle>
          <CardDescription>
            Uses whatsapp_business_messaging against Meta&apos;s test business number. The
            recipient must be one of the up to 5 numbers verified as a test recipient in the App
            Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Recipient, e.g. 916383984698"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          <Button onClick={sendTest} disabled={sending || !to || !message}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-4" /> Message templates
          </CardTitle>
          <CardDescription>
            Uses whatsapp_business_management to list templates on the connected WhatsApp
            Business Account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={loadTemplates} disabled={loadingTemplates} variant="outline">
            {loadingTemplates ? <Loader2 className="size-4 animate-spin" /> : <ListChecks className="size-4" />}
            List templates
          </Button>

          {templates && (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates on this account yet.</p>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      {t.name} <span className="text-muted-foreground">({t.language})</span>
                    </span>
                    <Badge variant="outline">{t.status}</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

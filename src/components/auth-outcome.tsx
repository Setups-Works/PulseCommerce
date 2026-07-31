import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Outcomes of the WooCommerce authorization redirect.
 *
 * Shared between the connect page and Settings so a failure never gets two
 * different explanations depending on where you started.
 */
export const AUTH_MESSAGES: Record<string, { title: string; detail: string; tone: "good" | "bad" }> = {
  connected: {
    title: "Store connected",
    detail: "WooCommerce issued a read-only key and this app verified it against your store.",
    tone: "good",
  },
  denied: {
    title: "Authorization declined",
    detail: "You chose not to approve access, so nothing was saved.",
    tone: "bad",
  },
  expired: {
    title: "Authorization expired",
    detail: "The request took longer than 15 minutes. Start again.",
    tone: "bad",
  },
  no_credentials: {
    title: "WooCommerce never delivered the key",
    detail:
      "The store approved the app but the callback did not arrive. That almost always means this app is not reachable from your store over HTTPS.",
    tone: "bad",
  },
  verification_failed: {
    title: "The issued key could not read the store",
    detail: "WooCommerce returned a key, but a test request with it failed. Nothing was saved.",
    tone: "bad",
  },
  missing_state: {
    title: "Authorization could not be matched",
    detail: "The response did not carry the token we started with. Start again from this page.",
    tone: "bad",
  },
  https_required: {
    title: "This app needs to be served over HTTPS",
    detail:
      "WooCommerce refuses to deliver credentials to a plain-HTTP callback. Run `npm run dev:https` locally, or set APP_URL to your public HTTPS address.",
    tone: "bad",
  },
  not_reachable: {
    title: "Your store cannot reach this app",
    detail:
      "WooCommerce delivers the key by POSTing to this app from your store's server, so a localhost or private-network address can never receive it. Expose this app on a public HTTPS URL, set APP_URL to that address, and try again.",
    tone: "bad",
  },
  bad_app_url: {
    title: "APP_URL could not be parsed",
    detail: "Set APP_URL to a full address including the scheme, for example https://analytics.example.com.",
    tone: "bad",
  },
  missing_store_url: {
    title: "No store URL given",
    detail: "Enter the address of the WooCommerce store you want to analyse.",
    tone: "bad",
  },
  bad_store_url: {
    title: "That store URL could not be parsed",
    detail: "Use the site root, for example https://yourstore.com — not the admin or an API path.",
    tone: "bad",
  },
  missing_auth_secret: {
    title: "AUTH_SECRET is not set",
    detail:
      "The authorization flow signs its state token with AUTH_SECRET, so it is required. Generate one with `openssl rand -hex 32`, add it to your environment, and redeploy.",
    tone: "bad",
  },
  no_storage: {
    title: "This deployment cannot save a connection",
    detail:
      "Serverless platforms have a read-only filesystem, so the issued key would arrive and immediately vanish. Add a Redis store and set KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV and Upstash both provide these), then redeploy.",
    tone: "bad",
  },
};

export function AuthOutcome({ outcome }: { outcome: string }) {
  const message = AUTH_MESSAGES[outcome];
  if (!message) return null;

  return (
    <Alert>
      {message.tone === "good" ? <CheckCircle2 /> : <TriangleAlert />}
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription>{message.detail}</AlertDescription>
    </Alert>
  );
}

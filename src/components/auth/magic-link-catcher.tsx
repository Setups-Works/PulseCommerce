"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Catches a Supabase auth redirect that lands on the marketing home page.
 *
 * A magic link (and any other Supabase email-link flow) delivers its tokens
 * in the URL *hash* (#access_token=...&refresh_token=...), which a server
 * can never see -- and this project's own Supabase Redirect URLs allowlist
 * only permits the bare origin, so every one of these links lands here on
 * `/` rather than on `/auth/callback` or a page built specifically for it.
 *
 * Deliberately does NOT rely on the Supabase client's own automatic
 * hash-detection (`detectSessionInUrl`) -- confirmed against a real
 * deployment that this project's client either isn't configured for it or
 * doesn't fire in time here, so `onAuthStateChange`/`getSession()` alone
 * never resolved. Parses the two tokens directly out of the hash instead and
 * calls `setSession` explicitly, which establishes (and persists, via the
 * same cookie-writing browser client every other page reads) the session
 * deterministically rather than hoping auto-detection engages.
 */
export function MagicLinkCatcher() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const errorDescription = params.get("error_description");
    if (errorDescription) {
      toast.error(errorDescription.replace(/\+/g, " "));
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    supabaseBrowser()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        window.history.replaceState(null, "", window.location.pathname);
        if (error) {
          toast.error(error.message);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      });
  }, [router]);

  return null;
}

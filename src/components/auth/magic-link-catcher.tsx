"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Catches a Supabase auth redirect that lands on the marketing home page.
 *
 * A magic link (and any other Supabase email-link flow) delivers its tokens
 * in the URL *hash* (#access_token=...), which a server can never see -- and
 * this project's own Supabase Redirect URLs allowlist only permits the bare
 * origin, so every one of these links lands here on `/` rather than on
 * `/auth/callback` or a page built specifically for it. See
 * reset-password-form.tsx for the identical constraint solved for the
 * password-recovery case: the Supabase browser client parses the hash
 * itself, asynchronously, after this component has already mounted, so this
 * listens for the resulting event rather than checking once and racing it.
 *
 * Renders nothing -- this only exists for the side effect, and must never
 * visibly disturb the marketing page it's mounted on for the overwhelming
 * majority of visits that carry no hash at all.
 */
export function MagicLinkCatcher() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || (!hash.includes("access_token") && !hash.includes("error"))) return;

    if (hash.includes("error")) {
      const params = new URLSearchParams(hash.slice(1));
      toast.error(
        params.get("error_description")?.replace(/\+/g, " ") ??
          "That sign-in link is invalid or has expired.",
      );
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const supabase = supabaseBrowser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/dashboard");
      }
    });

    // Covers the case where the hash was already processed (and the event
    // already fired) before this listener was attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser, supabaseConfigured } from "./client";

/**
 * Whether someone is signed in, in the browser.
 *
 * `undefined` while unknown, which is a state the UI has to render rather than
 * guess at. Guessing "signed out" makes the header flash "Log in" at somebody
 * who is signed in on every page load; guessing "signed in" does the reverse.
 * Callers show nothing until this resolves.
 *
 * Reads from the Supabase client rather than from `/api/auth/session`, because
 * the SDK already holds the session locally and can say so without a round
 * trip. The subscription keeps it right when a token refreshes or when someone
 * signs out in another tab.
 */
export function useSignedIn(): boolean | undefined {
  const [signedIn, setSignedIn] = useState<boolean | undefined>(
    // Nothing to check when Supabase is not configured, so resolve immediately
    // rather than leaving the UI in its indeterminate state forever.
    supabaseConfigured() ? undefined : false,
  );

  useEffect(() => {
    if (!supabaseConfigured()) return;

    let cancelled = false;
    const supabase = supabaseBrowser();

    /*
     * `getSession` rather than `getUser`: this only decides which link to show,
     * and getUser costs a request to the Auth server on every page load. The
     * cookie is client-controlled, so this is not a security decision — the
     * server checks properly on the route it protects.
     */
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data.session));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setSignedIn(Boolean(session));
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return signedIn;
}

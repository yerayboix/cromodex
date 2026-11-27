"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { acceptEmailLink } from "./actions";

/** Link types that end in choosing a password. */
const HANDLED = new Set(["invite", "recovery"]);

/**
 * Reads the session that Supabase puts in the URL fragment after an
 * invitation (default email template) and completes it on the server.
 * Renders a short status while it works; nothing when there is no link.
 */
export function EmailLinkHandler() {
  const router = useRouter();
  const [working, startWorking] = useTransition();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.size === 0) return;
    // Remove the tokens from the address bar and history right away.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (hash.has("error")) {
      router.replace("/login?enlace=caducado");
      return;
    }
    const type = hash.get("type") ?? "";
    if (!HANDLED.has(type)) return;

    startWorking(async () => {
      // On success the action redirects; only failures come back.
      const result = await acceptEmailLink(
        hash.get("access_token") ?? "",
        hash.get("refresh_token") ?? "",
        type,
      );
      if (result?.error) router.replace("/login?enlace=caducado");
    });
  }, [router]);

  if (!working) return null;
  return (
    <p role="status" className="mb-4 rounded-xl bg-panel-2 px-4 py-3 text-sm font-semibold">
      Abriendo tu invitación…
    </p>
  );
}

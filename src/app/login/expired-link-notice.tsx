"use client";

import { useSearchParams } from "next/navigation";

/** Shown when an invitation link could not be used (/auth/confirm). */
export function ExpiredLinkNotice() {
  if (useSearchParams().get("enlace") !== "caducado") return null;
  return (
    <p
      role="alert"
      className="mb-4 rounded-xl border-[1.5px] border-danger bg-danger-soft px-4 py-3 text-sm leading-normal text-danger-ink"
    >
      El enlace no es válido o ya se ha usado. Pide a quien administra el grupo que
      te envíe otra invitación.
    </p>
  );
}

import { cn } from "cn";

import { getCurrentUser } from "@/lib/auth";
import { getNotificationSettings } from "@/server/notifications/settings";
import { countMyTurn } from "@/server/queries";
import { getCollection } from "@/server/collections";

import { AccountMenu } from "./account-menu";

/*
 * Pieces of the shell that read the session. Render each one behind its own
 * <Suspense> boundary so the rest of the chrome does not wait for them.
 */

/** Number of negotiations waiting for the user's answer. */
export async function TurnBadge({
  slug,
  variant,
}: {
  slug: string;
  variant: "pill" | "dot";
}) {
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const n = await countMyTurn(collection.id, user.id);
  if (n === 0) return null;
  return (
    <span
      aria-label={n === 1 ? "1 espera tu respuesta" : `${n} esperan tu respuesta`}
      className={cn(
        "flex items-center justify-center rounded-full bg-turn font-extrabold text-white",
        variant === "pill" ? "h-[22px] min-w-[22px] px-1.5 text-xs" : "h-[18px] min-w-[18px] px-1 text-[11px]",
      )}
    >
      {n}
    </span>
  );
}

export async function AccountSlot({ variant }: { variant: "avatar" | "sidebar" }) {
  const user = await getCurrentUser();
  const notifications = await getNotificationSettings(user.id);
  return (
    <AccountMenu
      displayName={user.displayName}
      email={user.email}
      notifications={notifications}
      variant={variant}
    />
  );
}

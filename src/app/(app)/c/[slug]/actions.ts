"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { TradeError } from "@/server/errors";
import {
  acceptOffer,
  counterOffer,
  makeOffer,
  publishListings,
  rejectOffer,
  withdrawFromNegotiation,
  withdrawListing,
} from "@/server/trading";
import { addWanted, removeWanted } from "@/server/wanted";

/*
 * Server Actions of a collection. Each one checks the session again (the
 * proxy is only a first barrier) and turns business-rule failures into a
 * message for the form; anything else is a real error.
 */

export type ActionState = { error?: string };

async function attempt(fn: () => Promise<unknown>): Promise<ActionState | null> {
  try {
    await fn();
    // Re-render the whole collection shell too (turn badge, board beside the
    // panel): a redirect alone keeps the shared layout from the router cache.
    revalidatePath("/c/[slug]", "layout");
    return null;
  } catch (e) {
    if (e instanceof TradeError) return { error: e.message };
    throw e;
  }
}

function cardsFrom(formData: FormData) {
  return formData.getAll("card").map(String);
}

export async function publishAction(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const failed = await attempt(() =>
    publishListings({
      userId: user.id,
      collectionId: collection.id,
      slug,
      code: String(formData.get("code") ?? ""),
      copies: Number(formData.get("copies") ?? 1),
    }),
  );
  if (failed) return failed;
  redirect(paths.board(slug));
}

export async function withdrawListingAction(
  slug: string,
  listingId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const failed = await attempt(() => withdrawListing(user.id, listingId));
  if (failed) return failed;
  redirect(paths.board(slug));
}

export async function makeOfferAction(
  slug: string,
  listingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const failed = await attempt(() =>
    makeOffer({ userId: user.id, slug, listingId, cards: cardsFrom(formData) }),
  );
  if (failed) return failed;
  redirect(paths.card(slug, listingId));
}

export async function counterOfferAction(
  slug: string,
  listingId: string,
  negotiationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const failed = await attempt(() =>
    counterOffer({ userId: user.id, slug, negotiationId, cards: cardsFrom(formData) }),
  );
  if (failed) return failed;
  redirect(paths.card(slug, listingId));
}

export async function rejectOfferAction(
  slug: string,
  listingId: string,
  negotiationId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const failed = await attempt(() => rejectOffer(user.id, negotiationId));
  if (failed) return failed;
  redirect(paths.card(slug, listingId));
}

export async function withdrawNegotiationAction(
  slug: string,
  listingId: string,
  negotiationId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const failed = await attempt(() => withdrawFromNegotiation(user.id, negotiationId));
  if (failed) return failed;
  redirect(paths.card(slug, listingId));
}

export async function acceptOfferAction(
  slug: string,
  negotiationId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  let tradeId = "";
  const failed = await attempt(async () => {
    tradeId = await acceptOffer(user.id, negotiationId);
  });
  if (failed) return failed;
  redirect(paths.trade(slug, tradeId));
}

export async function addWantedAction(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const failed = await attempt(() =>
    addWanted(user.id, collection.id, slug, String(formData.get("code") ?? "")),
  );
  if (failed) return failed;
  return {};
}

export async function removeWantedAction(slug: string, code: string): Promise<void> {
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  await removeWanted(user.id, collection.id, code);
  revalidatePath("/c/[slug]", "layout");
}

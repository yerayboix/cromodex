import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { wanted } from "@/db/schema";
import { isValidCardCode, normalizeCardCode } from "@/lib/collections";

import { TradeError } from "./errors";

/** Adds a code to the user's wanted list (no-op if already there). */
export async function addWanted(
  userId: string,
  collectionId: string,
  slug: string,
  rawCode: string,
) {
  const code = normalizeCardCode(rawCode);
  if (!isValidCardCode(slug, code)) {
    throw new TradeError(`El ${code || "código"} no existe en esta colección.`);
  }
  await getDb()
    .insert(wanted)
    .values({ userId, collectionId, cardCode: code })
    .onConflictDoNothing();
}

export async function removeWanted(userId: string, collectionId: string, code: string) {
  await getDb()
    .delete(wanted)
    .where(
      and(
        eq(wanted.userId, userId),
        eq(wanted.collectionId, collectionId),
        eq(wanted.cardCode, code),
      ),
    );
}

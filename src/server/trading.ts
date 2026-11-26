import "server-only";

import { and, count, desc, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { events, listings, negotiations, proposals, trades } from "@/db/schema";
import { isValidCardCode, normalizeCardCode } from "@/lib/collections";

import { TradeError } from "./errors";

/*
 * Write side. Each function runs in one transaction, locks the rows it
 * decides on (FOR UPDATE) and records its domain events in the outbox.
 * Messages of TradeError are UI copy (Spanish).
 */

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Party = "owner" | "offerer";

export const MAX_COPIES = 10;
export const MAX_OFFER_CARDS = 10;

/** "A".."Z", then "AA", "AB"… for the n-th negotiation (0-based). */
export function negotiationAlias(n: number): string {
  let s = "";
  let i = n;
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}

/** Normalizes and validates a list of offered codes. */
export function parseCards(slug: string, raw: string[]): string[] {
  const cards = raw.map(normalizeCardCode).filter(Boolean);
  if (cards.length === 0) throw new TradeError("Añade al menos una carta.");
  if (cards.length > MAX_OFFER_CARDS) {
    throw new TradeError(`Como mucho ${MAX_OFFER_CARDS} cartas por oferta.`);
  }
  const wrong = cards.find((c) => !isValidCardCode(slug, c));
  if (wrong) throw new TradeError(`El ${wrong} no existe en esta colección.`);
  return cards;
}

function sameCards(a: string[], b: string[]) {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((c, i) => c === sb[i]);
}

async function emit(tx: Tx, type: string, payload: Record<string, unknown>) {
  await tx.insert(events).values({ type, payload });
}

// -------------------------------------------------------------- listings

export async function publishListings(input: {
  userId: string;
  collectionId: string;
  slug: string;
  code: string;
  copies: number;
}): Promise<void> {
  const code = normalizeCardCode(input.code);
  if (!isValidCardCode(input.slug, code)) {
    throw new TradeError(`El ${code || "código"} no existe en esta colección.`);
  }
  const copies = Math.trunc(input.copies);
  if (!(copies >= 1 && copies <= MAX_COPIES)) {
    throw new TradeError(`Puedes publicar de 1 a ${MAX_COPIES} copias a la vez.`);
  }
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .insert(listings)
      .values(
        Array.from({ length: copies }, () => ({
          collectionId: input.collectionId,
          ownerId: input.userId,
          cardCode: code,
        })),
      )
      .returning({ id: listings.id });
    for (const r of rows) {
      await emit(tx, "listing.created", { listingId: r.id, cardCode: code });
    }
  });
}

export async function withdrawListing(userId: string, listingId: string) {
  await getDb().transaction(async (tx) => {
    const [listing] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .for("update");
    if (!listing || listing.ownerId !== userId) {
      throw new TradeError("Esta carta no es tuya.");
    }
    if (listing.status !== "active") {
      throw new TradeError("Esta carta ya no está en la mesa.");
    }
    await tx
      .update(listings)
      .set({ status: "withdrawn" })
      .where(eq(listings.id, listingId));
    const cancelled = await closeOpen(tx, eq(negotiations.listingId, listingId), "cancelled");
    await emit(tx, "listing.withdrawn", { listingId });
    for (const id of cancelled) {
      await emit(tx, "negotiation.cancelled", { negotiationId: id, reason: "listing.withdrawn" });
    }
  });
}

/** Closes every open negotiation matching `where`; returns their ids. */
async function closeOpen(
  tx: Tx,
  where: ReturnType<typeof eq>,
  status: "cancelled" | "rejected" | "withdrawn",
) {
  const rows = await tx
    .update(negotiations)
    .set({ status, closedAt: new Date() })
    .where(and(where, eq(negotiations.status, "open")))
    .returning({ id: negotiations.id });
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------- negotiations

export async function makeOffer(input: {
  userId: string;
  slug: string;
  listingId: string;
  cards: string[];
}) {
  const cards = parseCards(input.slug, input.cards);
  await getDb().transaction(async (tx) => {
    // Locking the listing also serializes alias assignment.
    const [listing] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, input.listingId))
      .for("update");
    if (!listing || listing.status !== "active") {
      throw new TradeError("Esta carta ya no está en la mesa.");
    }
    if (listing.ownerId === input.userId) {
      throw new TradeError("No puedes ofertar por tu propia carta.");
    }
    const [{ n }] = await tx
      .select({ n: count() })
      .from(negotiations)
      .where(eq(negotiations.listingId, listing.id));
    const [neg] = await tx
      .insert(negotiations)
      .values({
        listingId: listing.id,
        offererId: input.userId,
        alias: negotiationAlias(n),
        turn: "owner",
      })
      .returning({ id: negotiations.id });
    await tx
      .insert(proposals)
      .values({ negotiationId: neg.id, by: "offerer", seq: 1, cards });
    await emit(tx, "negotiation.offered", { negotiationId: neg.id, listingId: listing.id, cards });
  });
}

/** Locks an open negotiation and its listing; returns the caller's side. */
async function lockNegotiation(tx: Tx, userId: string, negotiationId: string) {
  const [neg] = await tx
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, negotiationId))
    .for("update");
  if (!neg) throw new TradeError("Esta oferta ya no existe.");
  const [listing] = await tx
    .select()
    .from(listings)
    .where(eq(listings.id, neg.listingId))
    .for("update");
  const party: Party | null =
    listing.ownerId === userId ? "owner" : neg.offererId === userId ? "offerer" : null;
  if (!party) throw new TradeError("No participas en esta oferta.");
  if (neg.status !== "open" || listing.status !== "active") {
    throw new TradeError("Esta oferta ya está cerrada.");
  }
  return { neg, listing, party };
}

async function currentProposal(tx: Tx, negotiationId: string) {
  const [p] = await tx
    .select()
    .from(proposals)
    .where(eq(proposals.negotiationId, negotiationId))
    .orderBy(desc(proposals.seq))
    .limit(1);
  return p;
}

export async function counterOffer(input: {
  userId: string;
  slug: string;
  negotiationId: string;
  cards: string[];
}) {
  const cards = parseCards(input.slug, input.cards);
  await getDb().transaction(async (tx) => {
    const { neg, party } = await lockNegotiation(tx, input.userId, input.negotiationId);
    if (neg.turn !== party) throw new TradeError("Ahora no te toca responder.");
    const current = await currentProposal(tx, neg.id);
    if (sameCards(current.cards, cards)) {
      throw new TradeError("Cambia alguna carta antes de enviar la contraoferta.");
    }
    await tx
      .insert(proposals)
      .values({ negotiationId: neg.id, by: party, seq: current.seq + 1, cards });
    await tx
      .update(negotiations)
      .set({ turn: party === "owner" ? "offerer" : "owner" })
      .where(eq(negotiations.id, neg.id));
    await emit(tx, "negotiation.countered", { negotiationId: neg.id, by: party, cards });
  });
}

export async function rejectOffer(userId: string, negotiationId: string) {
  await getDb().transaction(async (tx) => {
    const { neg, party } = await lockNegotiation(tx, userId, negotiationId);
    if (neg.turn !== party) throw new TradeError("Ahora no te toca responder.");
    await closeOpen(tx, eq(negotiations.id, neg.id), "rejected");
    await emit(tx, "negotiation.rejected", { negotiationId: neg.id, by: party });
  });
}

/** Either side leaves an open negotiation, whoever has the turn. */
export async function withdrawFromNegotiation(userId: string, negotiationId: string) {
  await getDb().transaction(async (tx) => {
    const { neg, party } = await lockNegotiation(tx, userId, negotiationId);
    await closeOpen(tx, eq(negotiations.id, neg.id), "withdrawn");
    await emit(tx, "negotiation.withdrawn", { negotiationId: neg.id, by: party });
  });
}

// ---------------------------------------------------------------- accept

/**
 * Closes the deal atomically (see docs/architecture.md §6) and returns the
 * new trade id.
 */
export async function acceptOffer(userId: string, negotiationId: string) {
  return getDb().transaction(async (tx) => {
    const { neg, listing, party } = await lockNegotiation(tx, userId, negotiationId);
    if (neg.turn !== party) throw new TradeError("Ahora no te toca responder.");
    const current = await currentProposal(tx, neg.id);

    const [trade] = await tx
      .insert(trades)
      .values({
        negotiationId: neg.id,
        listingId: listing.id,
        ownerId: listing.ownerId,
        offererId: neg.offererId,
        ownerCard: listing.cardCode,
        offererCards: current.cards,
      })
      .returning({ id: trades.id });

    await tx
      .update(negotiations)
      .set({ status: "accepted", closedAt: new Date() })
      .where(eq(negotiations.id, neg.id));
    await tx
      .update(listings)
      .set({ status: "traded" })
      .where(eq(listings.id, listing.id));

    // Other offers on the same card.
    const sameListing = await closeOpen(
      tx,
      eq(negotiations.listingId, listing.id),
      "cancelled",
    );

    // The offerer's other open offers in this collection that hand over any
    // of the codes just given away.
    const theirs = await tx
      .select({ id: negotiations.id })
      .from(negotiations)
      .innerJoin(listings, eq(listings.id, negotiations.listingId))
      .where(
        and(
          eq(negotiations.offererId, neg.offererId),
          eq(negotiations.status, "open"),
          ne(negotiations.id, neg.id),
          eq(listings.collectionId, listing.collectionId),
        ),
      )
      .for("update", { of: negotiations });
    const given = new Set(current.cards);
    const conflicting: string[] = [];
    for (const { id } of theirs) {
      const p = await currentProposal(tx, id);
      if (p.cards.some((c) => given.has(c))) conflicting.push(id);
    }
    const conflicts = conflicting.length
      ? await closeOpen(tx, inArray(negotiations.id, conflicting), "cancelled")
      : [];

    await emit(tx, "trade.accepted", { tradeId: trade.id, negotiationId: neg.id, by: party });
    for (const id of sameListing) {
      await emit(tx, "negotiation.cancelled", { negotiationId: id, reason: "listing.traded" });
    }
    for (const id of conflicts) {
      await emit(tx, "negotiation.cancelled", { negotiationId: id, reason: "cards.traded" });
    }
    return trade.id;
  });
}

/**
 * What accepting would cancel, for the confirmation dialog. Read-only and
 * from the viewer's side only.
 */
export async function previewAccept(userId: string, negotiationId: string) {
  const db = getDb();
  const [neg] = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, negotiationId));
  if (!neg || neg.status !== "open") return null;
  const [listing] = await db.select().from(listings).where(eq(listings.id, neg.listingId));
  const [{ n: otherOffers }] = await db
    .select({ n: count() })
    .from(negotiations)
    .where(
      and(
        eq(negotiations.listingId, listing.id),
        eq(negotiations.status, "open"),
        ne(negotiations.id, neg.id),
      ),
    );
  const current = await db
    .select()
    .from(proposals)
    .where(eq(proposals.negotiationId, neg.id))
    .orderBy(desc(proposals.seq))
    .limit(1);
  const given = new Set(current[0]?.cards ?? []);

  // Conflicts are only revealed to the offerer: they are their own offers.
  const conflicts: { code: string; cards: string[] }[] = [];
  if (neg.offererId === userId) {
    const theirs = await db
      .select({ id: negotiations.id, code: listings.cardCode })
      .from(negotiations)
      .innerJoin(listings, eq(listings.id, negotiations.listingId))
      .where(
        and(
          eq(negotiations.offererId, userId),
          eq(negotiations.status, "open"),
          ne(negotiations.id, neg.id),
          eq(listings.collectionId, listing.collectionId),
        ),
      );
    for (const t of theirs) {
      const [p] = await db
        .select()
        .from(proposals)
        .where(eq(proposals.negotiationId, t.id))
        .orderBy(desc(proposals.seq))
        .limit(1);
      const clash = p?.cards.filter((c) => given.has(c)) ?? [];
      if (clash.length) conflicts.push({ code: t.code, cards: [...new Set(clash)] });
    }
  }
  return { otherOffers, conflicts };
}

import "server-only";

import { and, eq, ne } from "drizzle-orm";

import type { getDb } from "@/db";
import {
  collections,
  listings,
  negotiations,
  profiles,
  trades,
  wanted,
} from "@/db/schema";

import type { ClosedReason, Notification, Party } from "./types";

/*
 * From a domain event to the notifications it causes: who is told what.
 * Channel-agnostic. Never notifies the actor of the event.
 */

type Db = ReturnType<typeof getDb>;
type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type EventRow = { id: string; type: string; payload: unknown };

type Payload = Record<string, unknown> & { actorId?: string };

const CANCEL_REASONS: Record<string, ClosedReason> = {
  "listing.traded": "listing_traded",
  "listing.withdrawn": "listing_withdrawn",
  "cards.traded": "cards_traded",
};

const other = (p: Party): Party => (p === "owner" ? "offerer" : "owner");

export async function notificationsFor(db: Executor, event: EventRow): Promise<Notification[]> {
  const p = (event.payload ?? {}) as Payload;
  const result = await build(db, event.type, p);
  // Whoever caused the event already knows.
  return result.filter((n) => n.userId !== p.actorId);
}

async function build(db: Executor, type: string, p: Payload): Promise<Notification[]> {
  switch (type) {
    case "negotiation.offered": {
      const n = await negotiation(db, String(p.negotiationId));
      if (!n) return [];
      return [
        {
          kind: "offer.received",
          userId: n.ownerId,
          slug: n.slug,
          listingId: n.listingId,
          code: n.code,
          cards: asCards(p.cards),
        },
      ];
    }
    case "negotiation.countered": {
      const n = await negotiation(db, String(p.negotiationId));
      if (!n) return [];
      const role = other(p.by as Party);
      return [
        {
          kind: "counter.received",
          userId: role === "owner" ? n.ownerId : n.offererId,
          role,
          slug: n.slug,
          listingId: n.listingId,
          code: n.code,
          cards: asCards(p.cards),
        },
      ];
    }
    case "negotiation.rejected": {
      const n = await negotiation(db, String(p.negotiationId));
      if (!n) return [];
      const role = other(p.by as Party);
      return [
        {
          kind: "offer.closed",
          userId: role === "owner" ? n.ownerId : n.offererId,
          role,
          reason: "rejected",
          slug: n.slug,
          listingId: n.listingId,
          code: n.code,
        },
      ];
    }
    case "negotiation.withdrawn": {
      // Only the owner leaving matters to the other side.
      if (p.by !== "owner") return [];
      const n = await negotiation(db, String(p.negotiationId));
      if (!n) return [];
      return [closedForOfferer(n, "owner_left")];
    }
    case "negotiation.cancelled": {
      const reason = CANCEL_REASONS[String(p.reason)];
      const n = await negotiation(db, String(p.negotiationId));
      if (!n || !reason) return [];
      return [closedForOfferer(n, reason)];
    }
    case "trade.accepted": {
      const t = await trade(db, String(p.tradeId));
      if (!t) return [];
      // Tell the side that did not accept; the accepter sees the result.
      const role = other(p.by as Party);
      return [
        {
          kind: "trade.done",
          userId: role === "owner" ? t.ownerId : t.offererId,
          role,
          slug: t.slug,
          tradeId: t.id,
          otherName: role === "owner" ? t.offererName : t.ownerName,
          ownerCard: t.ownerCard,
          offererCards: t.offererCards,
        },
      ];
    }
    case "listing.created": {
      const [l] = await db
        .select({
          id: listings.id,
          code: listings.cardCode,
          ownerId: listings.ownerId,
          collectionId: listings.collectionId,
          slug: collections.slug,
        })
        .from(listings)
        .innerJoin(collections, eq(collections.id, listings.collectionId))
        .where(eq(listings.id, String(p.listingId)));
      if (!l) return [];
      const wanters = await db
        .select({ userId: wanted.userId })
        .from(wanted)
        .where(
          and(
            eq(wanted.collectionId, l.collectionId),
            eq(wanted.cardCode, l.code),
            ne(wanted.userId, l.ownerId),
          ),
        );
      return wanters.map((w) => ({
        kind: "wanted.available" as const,
        userId: w.userId,
        slug: l.slug,
        listingId: l.id,
        code: l.code,
      }));
    }
    default:
      return [];
  }
}

type NegotiationInfo = NonNullable<Awaited<ReturnType<typeof negotiation>>>;

function closedForOfferer(n: NegotiationInfo, reason: ClosedReason): Notification {
  return {
    kind: "offer.closed",
    userId: n.offererId,
    role: "offerer",
    reason,
    slug: n.slug,
    listingId: n.listingId,
    code: n.code,
  };
}

async function negotiation(db: Executor, id: string) {
  const [row] = await db
    .select({
      offererId: negotiations.offererId,
      listingId: listings.id,
      ownerId: listings.ownerId,
      code: listings.cardCode,
      slug: collections.slug,
    })
    .from(negotiations)
    .innerJoin(listings, eq(listings.id, negotiations.listingId))
    .innerJoin(collections, eq(collections.id, listings.collectionId))
    .where(eq(negotiations.id, id));
  return row ?? null;
}

async function trade(db: Executor, id: string) {
  const [row] = await db
    .select({
      id: trades.id,
      ownerId: trades.ownerId,
      offererId: trades.offererId,
      ownerCard: trades.ownerCard,
      offererCards: trades.offererCards,
      slug: collections.slug,
    })
    .from(trades)
    .innerJoin(listings, eq(listings.id, trades.listingId))
    .innerJoin(collections, eq(collections.id, listings.collectionId))
    .where(eq(trades.id, id));
  if (!row) return null;
  const names = await db
    .select({ id: profiles.id, name: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, row.ownerId))
    .union(
      db
        .select({ id: profiles.id, name: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, row.offererId)),
    );
  const nameOf = (uid: string) => names.find((n) => n.id === uid)?.name ?? "";
  return { ...row, ownerName: nameOf(row.ownerId), offererName: nameOf(row.offererId) };
}

function asCards(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

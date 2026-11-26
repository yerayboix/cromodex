import "server-only";

import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import {
  listings,
  negotiations,
  profiles,
  proposals,
  trades,
  wanted,
} from "@/db/schema";
import { cardSortIndex } from "@/lib/collections";

/*
 * Read side. Every function returns DTOs that never contain another user's
 * id: ownership is reduced to booleans relative to the viewer, and
 * negotiations are identified by their public alias.
 */

export type Party = "owner" | "offerer";

// ----------------------------------------------------------------- board

export type BoardCard = {
  id: string;
  code: string;
  offerCount: number;
  isMine: boolean;
  /** Mine and at least one offer waits for my answer. */
  myTurn: boolean;
  /** I have an open offer on it. */
  hasMyOffer: boolean;
};

export async function getBoard(
  collectionId: string,
  slug: string,
  viewerId: string,
): Promise<BoardCard[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: listings.id,
      code: listings.cardCode,
      ownerId: listings.ownerId,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(
      and(eq(listings.collectionId, collectionId), eq(listings.status, "active")),
    );
  if (rows.length === 0) return [];

  const open = await db
    .select({
      listingId: negotiations.listingId,
      offererId: negotiations.offererId,
      turn: negotiations.turn,
    })
    .from(negotiations)
    .where(
      and(
        inArray(
          negotiations.listingId,
          rows.map((r) => r.id),
        ),
        eq(negotiations.status, "open"),
      ),
    );

  const byListing = Map.groupBy(open, (n) => n.listingId);
  return rows
    .sort(
      (a, b) =>
        cardSortIndex(slug, a.code) - cardSortIndex(slug, b.code) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .map((r) => {
      const negs = byListing.get(r.id) ?? [];
      const isMine = r.ownerId === viewerId;
      return {
        id: r.id,
        code: r.code,
        offerCount: negs.length,
        isMine,
        myTurn: isMine && negs.some((n) => n.turn === "owner"),
        hasMyOffer: negs.some((n) => n.offererId === viewerId),
      };
    });
}

// --------------------------------------------------------------- listing

export type NegotiationView = {
  id: string;
  alias: string;
  /** The viewer's side in this negotiation, or null if not involved. */
  myRole: Party | null;
  /** Who must answer the current proposal. */
  turn: Party;
  myTurn: boolean;
  /** Current proposal: the cards the offerer gives. */
  cards: string[];
  /** Who made the current proposal. */
  lastBy: Party;
  /** The offerer's latest own proposal (to show what they offered). */
  lastOfferedCards: string[];
};

export type ListingView = {
  id: string;
  code: string;
  status: "active" | "withdrawn" | "traded";
  isMine: boolean;
  createdAt: Date;
  negotiations: NegotiationView[];
};

export async function getListing(
  listingId: string,
  collectionId: string,
  viewerId: string,
): Promise<ListingView | null> {
  const db = getDb();
  const [listing] = await db
    .select({
      id: listings.id,
      code: listings.cardCode,
      status: listings.status,
      ownerId: listings.ownerId,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.collectionId, collectionId)))
    .limit(1);
  if (!listing) return null;

  const isMine = listing.ownerId === viewerId;
  const negs = await db
    .select({
      id: negotiations.id,
      alias: negotiations.alias,
      offererId: negotiations.offererId,
      turn: negotiations.turn,
    })
    .from(negotiations)
    .where(
      and(eq(negotiations.listingId, listingId), eq(negotiations.status, "open")),
    )
    .orderBy(asc(negotiations.createdAt));

  const props = await latestProposals(negs.map((n) => n.id));
  return {
    id: listing.id,
    code: listing.code,
    status: listing.status,
    isMine,
    createdAt: listing.createdAt,
    negotiations: negs.map((n) => {
      const myRole: Party | null = isMine
        ? "owner"
        : n.offererId === viewerId
          ? "offerer"
          : null;
      const p = props.get(n.id);
      return {
        id: n.id,
        alias: n.alias,
        myRole,
        turn: n.turn,
        myTurn: myRole !== null && myRole === n.turn,
        cards: p?.current.cards ?? [],
        lastBy: p?.current.by ?? "offerer",
        lastOfferedCards: p?.lastByOfferer ?? [],
      };
    }),
  };
}

/** Current proposal and the offerer's latest one, per negotiation. */
async function latestProposals(negotiationIds: string[]) {
  const result = new Map<
    string,
    { current: { cards: string[]; by: Party }; lastByOfferer: string[] }
  >();
  if (negotiationIds.length === 0) return result;
  const rows = await getDb()
    .select({
      negotiationId: proposals.negotiationId,
      by: proposals.by,
      cards: proposals.cards,
    })
    .from(proposals)
    .where(inArray(proposals.negotiationId, negotiationIds))
    .orderBy(asc(proposals.seq));
  for (const r of rows) {
    const prev = result.get(r.negotiationId);
    result.set(r.negotiationId, {
      current: { cards: r.cards, by: r.by },
      lastByOfferer: r.by === "offerer" ? r.cards : (prev?.lastByOfferer ?? []),
    });
  }
  return result;
}

// ------------------------------------------------------------- my trades

export type MyTradeItem = {
  negotiationId: string;
  listingId: string;
  code: string;
  /** "owner": an offer on my card; "offerer": my offer on someone's card. */
  role: Party;
  alias: string;
  myTurn: boolean;
  cards: string[];
  lastBy: Party;
};

export type MyTrades = {
  myTurn: MyTradeItem[];
  waiting: MyTradeItem[];
  idleListings: { listingId: string; code: string; createdAt: Date }[];
};

export async function getMyTrades(
  collectionId: string,
  slug: string,
  viewerId: string,
): Promise<MyTrades> {
  const db = getDb();
  const negs = await db
    .select({
      id: negotiations.id,
      alias: negotiations.alias,
      turn: negotiations.turn,
      listingId: listings.id,
      code: listings.cardCode,
      ownerId: listings.ownerId,
    })
    .from(negotiations)
    .innerJoin(listings, eq(listings.id, negotiations.listingId))
    .where(
      and(
        eq(listings.collectionId, collectionId),
        eq(listings.status, "active"),
        eq(negotiations.status, "open"),
        or(eq(listings.ownerId, viewerId), eq(negotiations.offererId, viewerId)),
      ),
    )
    .orderBy(asc(negotiations.createdAt));

  const props = await latestProposals(negs.map((n) => n.id));
  const items: MyTradeItem[] = negs.map((n) => {
    const role: Party = n.ownerId === viewerId ? "owner" : "offerer";
    const p = props.get(n.id);
    return {
      negotiationId: n.id,
      listingId: n.listingId,
      code: n.code,
      role,
      alias: n.alias,
      myTurn: n.turn === role,
      cards: p?.current.cards ?? [],
      lastBy: p?.current.by ?? "offerer",
    };
  });

  const mine = await db
    .select({ id: listings.id, code: listings.cardCode, createdAt: listings.createdAt })
    .from(listings)
    .where(
      and(
        eq(listings.collectionId, collectionId),
        eq(listings.ownerId, viewerId),
        eq(listings.status, "active"),
      ),
    );
  const withOffers = new Set(
    items.filter((i) => i.role === "owner").map((i) => i.listingId),
  );

  return {
    myTurn: items.filter((i) => i.myTurn),
    waiting: items.filter((i) => !i.myTurn),
    idleListings: mine
      .filter((l) => !withOffers.has(l.id))
      .sort((a, b) => cardSortIndex(slug, a.code) - cardSortIndex(slug, b.code))
      .map((l) => ({ listingId: l.id, code: l.code, createdAt: l.createdAt })),
  };
}

/** How many open negotiations wait for the viewer's answer. */
export async function countMyTurn(
  collectionId: string,
  viewerId: string,
): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(negotiations)
    .innerJoin(listings, eq(listings.id, negotiations.listingId))
    .where(
      and(
        eq(listings.collectionId, collectionId),
        eq(listings.status, "active"),
        eq(negotiations.status, "open"),
        or(
          and(eq(listings.ownerId, viewerId), eq(negotiations.turn, "owner")),
          and(
            eq(negotiations.offererId, viewerId),
            eq(negotiations.turn, "offerer"),
          ),
        ),
      ),
    );
  return row?.n ?? 0;
}

// ---------------------------------------------------------------- wanted

export type WantedView = {
  mine: { code: string; onTable: boolean }[];
  group: { code: string; wantedBy: number; onTable: number }[];
};

export async function getWanted(
  collectionId: string,
  slug: string,
  viewerId: string,
): Promise<WantedView> {
  const db = getDb();
  const [mineRows, groupRows, tableRows] = await Promise.all([
    db
      .select({ code: wanted.cardCode })
      .from(wanted)
      .where(
        and(eq(wanted.collectionId, collectionId), eq(wanted.userId, viewerId)),
      ),
    db
      .select({ code: wanted.cardCode, n: count() })
      .from(wanted)
      .where(eq(wanted.collectionId, collectionId))
      .groupBy(wanted.cardCode),
    db
      .select({ code: listings.cardCode, n: count() })
      .from(listings)
      .where(
        and(eq(listings.collectionId, collectionId), eq(listings.status, "active")),
      )
      .groupBy(listings.cardCode),
  ]);
  const onTable = new Map(tableRows.map((r) => [r.code, r.n]));
  const album = (a: string, b: string) =>
    cardSortIndex(slug, a) - cardSortIndex(slug, b);
  return {
    mine: mineRows
      .map((r) => ({ code: r.code, onTable: (onTable.get(r.code) ?? 0) > 0 }))
      .sort((a, b) => album(a.code, b.code)),
    group: groupRows
      .map((r) => ({
        code: r.code,
        wantedBy: r.n,
        onTable: onTable.get(r.code) ?? 0,
      }))
      .sort((a, b) => b.wantedBy - a.wantedBy || album(a.code, b.code)),
  };
}

/** The viewer's own wanted codes (for the "Me faltan" filter). */
export async function getMyWantedCodes(
  collectionId: string,
  viewerId: string,
): Promise<Set<string>> {
  const rows = await getDb()
    .select({ code: wanted.cardCode })
    .from(wanted)
    .where(and(eq(wanted.collectionId, collectionId), eq(wanted.userId, viewerId)));
  return new Set(rows.map((r) => r.code));
}

// ------------------------------------------------------------------- log

export type TradeView = {
  id: string;
  /** Names are public once a trade is accepted. */
  ownerName: string;
  offererName: string;
  ownerCard: string;
  offererCards: string[];
  acceptedAt: Date;
  /** The viewer's side in this trade, or null. */
  myRole: Party | null;
};

const ownerProfile = alias(profiles, "owner_profile");
const offererProfile = alias(profiles, "offerer_profile");

function tradeSelect() {
  return getDb()
    .select({
      id: trades.id,
      ownerId: trades.ownerId,
      offererId: trades.offererId,
      ownerName: ownerProfile.displayName,
      offererName: offererProfile.displayName,
      ownerCard: trades.ownerCard,
      offererCards: trades.offererCards,
      acceptedAt: trades.acceptedAt,
    })
    .from(trades)
    .innerJoin(listings, eq(listings.id, trades.listingId))
    .innerJoin(ownerProfile, eq(ownerProfile.id, trades.ownerId))
    .innerJoin(offererProfile, eq(offererProfile.id, trades.offererId));
}

type TradeRow = Awaited<ReturnType<typeof tradeSelect>>[number];

function toTradeView(r: TradeRow, viewerId: string): TradeView {
  return {
    id: r.id,
    ownerName: r.ownerName,
    offererName: r.offererName,
    ownerCard: r.ownerCard,
    offererCards: r.offererCards,
    acceptedAt: r.acceptedAt,
    myRole:
      r.ownerId === viewerId ? "owner" : r.offererId === viewerId ? "offerer" : null,
  };
}

export async function getTradeLog(
  collectionId: string,
  viewerId: string,
): Promise<TradeView[]> {
  const rows = await tradeSelect()
    .where(eq(listings.collectionId, collectionId))
    .orderBy(desc(trades.acceptedAt))
    .limit(200);
  return rows.map((r) => toTradeView(r, viewerId));
}

export async function getTrade(
  tradeId: string,
  collectionId: string,
  viewerId: string,
): Promise<TradeView | null> {
  const [row] = await tradeSelect()
    .where(and(eq(trades.id, tradeId), eq(listings.collectionId, collectionId)))
    .limit(1);
  return row ? toTradeView(row, viewerId) : null;
}

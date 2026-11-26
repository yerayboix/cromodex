import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

/**
 * All application tables live in the `app` schema, which is NOT exposed
 * through the Supabase Data API. RLS is enabled without policies as a
 * second barrier: only the server (Drizzle, as the postgres role) reads data.
 */
export const app = pgSchema("app");

// ---------------------------------------------------------------- enums

export const listingStatus = app.enum("listing_status", [
  "active",
  "withdrawn",
  "traded",
]);

export const negotiationStatus = app.enum("negotiation_status", [
  "open",
  "accepted",
  "rejected",
  "cancelled",
  "withdrawn",
]);

/** The two sides of a negotiation. */
export const party = app.enum("party", ["owner", "offerer"]);

const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------- collections

/**
 * The list of valid card codes per collection lives in code
 * (src/lib/collections.ts), keyed by `slug`, not in the database.
 */
export const collections = app
  .table("collections", {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
  })
  .enableRLS();

// ------------------------------------------------------------- profiles

export const profiles = app
  .table("profiles", {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text().notNull(),
  })
  .enableRLS();

// ------------------------------------------------------------- listings

/**
 * One listing = one physical copy, with its own lifecycle. Publishing
 * 3 copies of a card creates 3 independent listings.
 */
export const listings = app
  .table(
    "listings",
    {
      id: uuid().primaryKey().defaultRandom(),
      collectionId: uuid()
        .notNull()
        .references(() => collections.id),
      ownerId: uuid()
        .notNull()
        .references(() => profiles.id),
      cardCode: text().notNull(),
      status: listingStatus().notNull().default("active"),
      createdAt: createdAt(),
    },
    (t) => [index("listings_board_idx").on(t.collectionId, t.status)],
  )
  .enableRLS();

// --------------------------------------------------------- negotiations

export const negotiations = app
  .table(
    "negotiations",
    {
      id: uuid().primaryKey().defaultRandom(),
      listingId: uuid()
        .notNull()
        .references(() => listings.id),
      offererId: uuid()
        .notNull()
        .references(() => profiles.id),
      /** Public, untraceable label ("A", "B"…), unique per listing. */
      alias: text().notNull(),
      status: negotiationStatus().notNull().default("open"),
      /** Who must answer the current proposal. */
      turn: party().notNull().default("owner"),
      createdAt: createdAt(),
      closedAt: timestamp({ withTimezone: true }),
    },
    (t) => [
      unique("negotiations_listing_alias_key").on(t.listingId, t.alias),
      index("negotiations_listing_status_idx").on(t.listingId, t.status),
      index("negotiations_offerer_status_idx").on(t.offererId, t.status),
      check(
        "negotiations_closed_at_check",
        sql`(${t.status} = 'open') = (${t.closedAt} is null)`,
      ),
    ],
  )
  .enableRLS();

/**
 * One turn of a negotiation. The current proposal is the highest `seq`.
 * `cards` are the codes the offerer gives (repeats allowed).
 */
export const proposals = app
  .table(
    "proposals",
    {
      id: uuid().primaryKey().defaultRandom(),
      negotiationId: uuid()
        .notNull()
        .references(() => negotiations.id, { onDelete: "cascade" }),
      by: party().notNull(),
      seq: integer().notNull(),
      cards: text().array().notNull(),
      createdAt: createdAt(),
    },
    (t) => [
      unique("proposals_negotiation_seq_key").on(t.negotiationId, t.seq),
      check("proposals_seq_check", sql`${t.seq} >= 1`),
      check("proposals_cards_check", sql`cardinality(${t.cards}) >= 1`),
    ],
  )
  .enableRLS();

// --------------------------------------------------------------- trades

/** Public, immutable log of accepted trades (names revealed here only). */
export const trades = app
  .table(
    "trades",
    {
      id: uuid().primaryKey().defaultRandom(),
      negotiationId: uuid()
        .notNull()
        .unique()
        .references(() => negotiations.id),
      // A listing is one copy, so it can be traded only once.
      listingId: uuid()
        .notNull()
        .unique()
        .references(() => listings.id),
      ownerId: uuid()
        .notNull()
        .references(() => profiles.id),
      offererId: uuid()
        .notNull()
        .references(() => profiles.id),
      ownerCard: text().notNull(),
      offererCards: text().array().notNull(),
      acceptedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      index("trades_accepted_at_idx").on(t.acceptedAt),
      check(
        "trades_offerer_cards_check",
        sql`cardinality(${t.offererCards}) >= 1`,
      ),
      check("trades_distinct_parties_check", sql`${t.ownerId} <> ${t.offererId}`),
    ],
  )
  .enableRLS();

// --------------------------------------------------------------- wanted

export const wanted = app
  .table(
    "wanted",
    {
      userId: uuid()
        .notNull()
        .references(() => profiles.id, { onDelete: "cascade" }),
      collectionId: uuid()
        .notNull()
        .references(() => collections.id),
      cardCode: text().notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.userId, t.collectionId, t.cardCode] }),
      index("wanted_collection_card_idx").on(t.collectionId, t.cardCode),
    ],
  )
  .enableRLS();

// --------------------------------------------------------------- events

/** Outbox: every mutation inserts here in the same transaction. */
export const events = app
  .table(
    "events",
    {
      id: uuid().primaryKey().defaultRandom(),
      type: text().notNull(),
      payload: jsonb().notNull(),
      createdAt: createdAt(),
      dispatchedAt: timestamp({ withTimezone: true }),
    },
    (t) => [
      index("events_pending_idx")
        .on(t.createdAt)
        .where(sql`${t.dispatchedAt} is null`),
    ],
  )
  .enableRLS();

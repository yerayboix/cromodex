import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
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
  "exhausted",
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

export const collections = app
  .table("collections", {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
  })
  .enableRLS();

export const cards = app
  .table(
    "cards",
    {
      id: uuid().primaryKey().defaultRandom(),
      collectionId: uuid()
        .notNull()
        .references(() => collections.id, { onDelete: "cascade" }),
      code: text().notNull(),
      sortOrder: integer().notNull(),
    },
    (t) => [
      // Target for the composite FKs that validate card codes.
      unique("cards_collection_code_key").on(t.collectionId, t.code),
      unique("cards_collection_sort_key").on(t.collectionId, t.sortOrder),
    ],
  )
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

export const listings = app
  .table(
    "listings",
    {
      id: uuid().primaryKey().defaultRandom(),
      collectionId: uuid().notNull(),
      ownerId: uuid()
        .notNull()
        .references(() => profiles.id),
      cardCode: text().notNull(),
      copiesTotal: integer().notNull(),
      copiesLeft: integer().notNull(),
      status: listingStatus().notNull().default("active"),
      createdAt: createdAt(),
    },
    (t) => [
      foreignKey({
        name: "listings_card_fk",
        columns: [t.collectionId, t.cardCode],
        foreignColumns: [cards.collectionId, cards.code],
      }),
      check("listings_copies_total_check", sql`${t.copiesTotal} >= 1`),
      check(
        "listings_copies_left_check",
        sql`${t.copiesLeft} between 0 and ${t.copiesTotal}`,
      ),
      index("listings_board_idx").on(t.collectionId, t.status),
      // One active listing per user and card: add copies instead.
      uniqueIndex("listings_one_active_per_card_idx")
        .on(t.ownerId, t.collectionId, t.cardCode)
        .where(sql`${t.status} = 'active'`),
    ],
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

/** One turn of a negotiation. The current proposal is the highest `seq`. */
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
      createdAt: createdAt(),
    },
    (t) => [
      unique("proposals_negotiation_seq_key").on(t.negotiationId, t.seq),
      check("proposals_seq_check", sql`${t.seq} >= 1`),
    ],
  )
  .enableRLS();

/**
 * Cards the offerer gives in a proposal. Codes are validated against the
 * listing's collection in the server layer (no direct collection_id here).
 */
export const proposalCards = app
  .table(
    "proposal_cards",
    {
      proposalId: uuid()
        .notNull()
        .references(() => proposals.id, { onDelete: "cascade" }),
      cardCode: text().notNull(),
    },
    (t) => [primaryKey({ columns: [t.proposalId, t.cardCode] })],
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
      listingId: uuid()
        .notNull()
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
      collectionId: uuid().notNull(),
      cardCode: text().notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.userId, t.collectionId, t.cardCode] }),
      foreignKey({
        name: "wanted_card_fk",
        columns: [t.collectionId, t.cardCode],
        foreignColumns: [cards.collectionId, cards.code],
      }),
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

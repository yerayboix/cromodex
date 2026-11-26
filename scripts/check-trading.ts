/**
 * Business-rule checks of src/server/trading.ts against the LOCAL Supabase
 * stack. Run: npm run local:check. Creates its own listings; never touches
 * the cloud project (the URL guard below refuses anything non-local).
 */
import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { collections, listings, negotiations, profiles, trades } from "../src/db/schema";
import { TradeError } from "../src/server/errors";
import {
  acceptOffer,
  counterOffer,
  makeOffer,
  publishListings,
  rejectOffer,
  withdrawFromNegotiation,
  withdrawListing,
} from "../src/server/trading";

const url = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost):/.test(url)) {
  throw new Error("Refusing to run against a non-local database");
}

const slug = "rumbo-a-egghead";
let failures = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function rejects(name: string, fn: () => Promise<unknown>, message?: string) {
  try {
    await fn();
    ok(name, false, "did not throw");
  } catch (e) {
    const good = e instanceof TradeError && (!message || e.message.includes(message));
    ok(name, good, e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  const db = getDb();
  const [col] = await db.select().from(collections).where(eq(collections.slug, slug));
  const users = await db.select().from(profiles);
  const id = (name: string) => users.find((u) => u.displayName.startsWith(name))!.id;
  const ana = id("Ana");
  const marcos = id("Marcos");
  const laura = id("Laura");

  const newListing = async (owner: string, code: string) => {
    await publishListings({ userId: owner, collectionId: col.id, slug, code, copies: 1 });
    const all = await db.select().from(listings).where(eq(listings.ownerId, owner));
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  };
  const openNeg = async (listingId: string, offerer: string) => {
    const rows = await db.select().from(negotiations).where(eq(negotiations.listingId, listingId));
    return rows.filter((n) => n.offererId === offerer && n.status === "open").at(-1)!;
  };

  // --- publishing
  await rejects("publish rejects an unknown code", () =>
    publishListings({ userId: ana, collectionId: col.id, slug, code: "F28", copies: 1 }),
  );
  await rejects("publish rejects 0 copies", () =>
    publishListings({ userId: ana, collectionId: col.id, slug, code: "1", copies: 0 }),
  );
  await rejects("publish rejects 11 copies", () =>
    publishListings({ userId: ana, collectionId: col.id, slug, code: "1", copies: 11 }),
  );

  // --- offers
  const l1 = await newListing(ana, "101");
  await rejects("owner cannot offer on own card", () =>
    makeOffer({ userId: ana, slug, listingId: l1.id, cards: ["5"] }),
  );
  await rejects("offer rejects unknown codes", () =>
    makeOffer({ userId: marcos, slug, listingId: l1.id, cards: ["5", "999"] }),
  );
  await rejects("offer needs at least one card", () =>
    makeOffer({ userId: marcos, slug, listingId: l1.id, cards: [] }),
  );
  await makeOffer({ userId: marcos, slug, listingId: l1.id, cards: ["5", "5"] });
  const n1 = await openNeg(l1.id, marcos);
  ok("first offer gets alias A and owner's turn", n1.alias === "A" && n1.turn === "owner");

  await rejects("offerer cannot counter out of turn", () =>
    counterOffer({ userId: marcos, slug, negotiationId: n1.id, cards: ["6"] }),
  );
  await rejects("offerer cannot accept out of turn", () => acceptOffer(marcos, n1.id));
  await rejects("third party cannot reject", () => rejectOffer(laura, n1.id), "No participas");
  await rejects("counter must change something", () =>
    counterOffer({ userId: ana, slug, negotiationId: n1.id, cards: ["5", "5"] }),
  );
  await counterOffer({ userId: ana, slug, negotiationId: n1.id, cards: ["5", "6"] });
  const n1b = (await db.select().from(negotiations).where(eq(negotiations.id, n1.id)))[0];
  ok("counter passes the turn to the offerer", n1b.turn === "offerer");
  await rejects("owner cannot accept own counter", () => acceptOffer(ana, n1.id));

  // --- concurrent accepts on the same card: exactly one wins
  await makeOffer({ userId: laura, slug, listingId: l1.id, cards: ["9"] });
  const n2 = await openNeg(l1.id, laura);
  ok("second offer gets alias B", n2.alias === "B");
  const results = await Promise.allSettled([acceptOffer(marcos, n1.id), acceptOffer(ana, n2.id)]);
  const wins = results.filter((r) => r.status === "fulfilled").length;
  ok("two simultaneous accepts: exactly one succeeds", wins === 1, results.map((r) => r.status).join(","));
  const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  ok("the loser gets a readable error", loser?.reason instanceof TradeError, String(loser?.reason?.message));
  const t = await db.select().from(trades).where(eq(trades.listingId, l1.id));
  ok("one trade row for the card", t.length === 1);
  const after = await db.select().from(negotiations).where(eq(negotiations.listingId, l1.id));
  ok(
    "the losing negotiation is cancelled",
    after.filter((n) => n.status === "accepted").length === 1 &&
      after.filter((n) => n.status === "cancelled").length === 1,
    after.map((n) => `${n.alias}:${n.status}`).join(","),
  );
  await rejects("cannot offer on a traded card", () =>
    makeOffer({ userId: laura, slug, listingId: l1.id, cards: ["1"] }),
  );

  // --- withdrawals
  const l2 = await newListing(laura, "102");
  await makeOffer({ userId: ana, slug, listingId: l2.id, cards: ["3"] });
  await rejects("non-owner cannot withdraw a card", () => withdrawListing(ana, l2.id), "no es tuya");
  await withdrawListing(laura, l2.id);
  const n3 = await openNeg(l2.id, ana);
  ok("withdrawing a card cancels its open offers", n3 === undefined);
  await rejects("cannot withdraw twice", () => withdrawListing(laura, l2.id));

  const l3 = await newListing(laura, "103");
  await makeOffer({ userId: ana, slug, listingId: l3.id, cards: ["3"] });
  const n4 = await openNeg(l3.id, ana);
  await withdrawFromNegotiation(ana, n4.id);
  await rejects("closed negotiation cannot be accepted", () => acceptOffer(laura, n4.id), "cerrada");
  await rejects("invalid ids are business errors", () => acceptOffer(laura, "not-a-uuid"));
  console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

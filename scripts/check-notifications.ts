/**
 * Notification rules and dispatch against the LOCAL Supabase stack, with the
 * console channel. Run: npm run local:check. Never touches the cloud project.
 */
import { and, eq, gte, inArray } from "drizzle-orm";

import { getDb } from "../src/db";
import {
  collections,
  events,
  listings,
  negotiations,
  notificationDeliveries,
  notificationPreferences,
  profiles,
} from "../src/db/schema";
import { deliver, fanOut, isQuietHours } from "../src/server/notifications/dispatch";
import {
  acceptOffer,
  counterOffer,
  makeOffer,
  publishListings,
  rejectOffer,
} from "../src/server/trading";
import { addWanted, removeWanted } from "../src/server/wanted";

const url = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost):/.test(url)) {
  throw new Error("Refusing to run against a non-local database");
}
process.env.NOTIFICATIONS_CONSOLE = "1";
// Keep the console quiet: the check reads the deliveries table instead.
console.info = () => {};

const slug = "rumbo-a-egghead";
let failures = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  const db = getDb();
  const [col] = await db.select().from(collections).where(eq(collections.slug, slug));
  const users = await db.select().from(profiles);
  const user = (name: string) => users.find((u) => u.displayName.startsWith(name))!;
  const ana = user("Ana").id;
  const marcos = user("Marcos").id;
  const laura = user("Laura").id;
  const names = users.map((u) => u.displayName).filter((n) => n.length > 2);

  // Start clean: earlier events and deliveries are not part of this run;
  // everyone opted in.
  await fanOut();
  while ((await deliver()) > 0);
  await db.delete(notificationPreferences).where(inArray(notificationPreferences.userId, [ana, marcos, laura]));
  const start = new Date();

  const latestListing = async (owner: string) => {
    const rows = await db.select().from(listings).where(eq(listings.ownerId, owner));
    return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  };
  const openNeg = async (listingId: string, offerer: string) => {
    const rows = await db.select().from(negotiations).where(eq(negotiations.listingId, listingId));
    return rows.filter((n) => n.offererId === offerer && n.status === "open").at(-1)!;
  };
  /** Deliveries of this run, as "who:kind". */
  const sent = async () => {
    await fanOut();
    const rows = await db
      .select({ userId: notificationDeliveries.userId, kind: notificationDeliveries.kind, message: notificationDeliveries.message })
      .from(notificationDeliveries)
      .innerJoin(events, eq(events.id, notificationDeliveries.eventId))
      .where(and(gte(events.createdAt, start), eq(notificationDeliveries.channel, "console")));
    return rows;
  };
  const who = (id: string) => (id === ana ? "ana" : id === marcos ? "marcos" : id === laura ? "laura" : "other");
  const since = async (from: number) => (await sent()).slice(from).map((r) => `${who(r.userId)}:${r.kind}`).sort();

  // --- wanted
  await addWanted(marcos, col.id, slug, "F27");
  await addWanted(laura, col.id, slug, "F27");
  await addWanted(ana, col.id, slug, "F27");
  let n = (await sent()).length;
  await publishListings({ userId: ana, collectionId: col.id, slug, code: "F27", copies: 1 });
  const l = await latestListing(ana);
  ok(
    "a wanted card reaches those who want it, never the publisher",
    JSON.stringify(await since(n)) === JSON.stringify(["laura:wanted.available", "marcos:wanted.available"]),
    (await since(n)).join(","),
  );

  // --- offer and counters
  n = (await sent()).length;
  await makeOffer({ userId: marcos, slug, listingId: l.id, cards: ["1"] });
  ok("an offer notifies the owner only", (await since(n)).join() === "ana:offer.received", (await since(n)).join());

  const neg = await openNeg(l.id, marcos);
  n = (await sent()).length;
  await counterOffer({ userId: ana, slug, negotiationId: neg.id, cards: ["1", "2"] });
  ok("the owner's counter notifies the offerer", (await since(n)).join() === "marcos:counter.received", (await since(n)).join());

  n = (await sent()).length;
  await counterOffer({ userId: marcos, slug, negotiationId: neg.id, cards: ["1", "3"] });
  ok("the offerer's counter notifies the owner", (await since(n)).join() === "ana:counter.received", (await since(n)).join());

  // --- accept: the other offer is cancelled
  await makeOffer({ userId: laura, slug, listingId: l.id, cards: ["4"] });
  n = (await sent()).length;
  await acceptOffer(ana, neg.id);
  ok(
    "accepting tells the offerer and closes the other offer",
    JSON.stringify(await since(n)) === JSON.stringify(["laura:offer.closed", "marcos:trade.done"]),
    (await since(n)).join(","),
  );

  // --- rejection
  await publishListings({ userId: laura, collectionId: col.id, slug, code: "5", copies: 1 });
  const l2 = await latestListing(laura);
  await makeOffer({ userId: ana, slug, listingId: l2.id, cards: ["6"] });
  n = (await sent()).length;
  await rejectOffer(laura, (await openNeg(l2.id, ana)).id);
  ok("a rejection notifies the offerer", (await since(n)).join() === "ana:offer.closed", (await since(n)).join());

  // --- preferences
  await db.insert(notificationPreferences).values({ userId: laura, topic: "wanted", enabled: false });
  n = (await sent()).length;
  await publishListings({ userId: ana, collectionId: col.id, slug, code: "F27", copies: 1 });
  ok("a member who switched off 'wanted' gets nothing", (await since(n)).join() === "marcos:wanted.available", (await since(n)).join());

  // --- anonymity: only "trade done" may carry a name
  const all = await sent();
  const leaks = all.filter((r) => r.kind !== "trade.done").filter((r) => names.some((name) => JSON.stringify(r.message).includes(name)));
  ok("no message except 'trade done' names anyone", leaks.length === 0, leaks.map((r) => r.kind).join(","));
  const done = all.find((r) => r.kind === "trade.done");
  ok("'trade done' names the other side", JSON.stringify(done?.message).includes("Ana"), (done?.message as { body?: string })?.body);

  // --- delivery: everything pending goes out; wanted notices merge per member
  let total = 0;
  for (let i = 0; i < 5; i++) total += await deliver();
  const left = await db
    .select({ id: notificationDeliveries.id })
    .from(notificationDeliveries)
    .innerJoin(events, eq(events.id, notificationDeliveries.eventId))
    .where(and(gte(events.createdAt, start), eq(notificationDeliveries.status, "pending")));
  ok("all deliveries were sent", left.length === 0 && total > 0, `sent ${total}, pending ${left.length}`);
  ok("two wanted notices to Marcos became one message", total === all.length - 1, `${all.length} deliveries, ${total} messages`);

  ok("quiet hours: 02:00 Madrid is silent", isQuietHours(new Date("2026-11-27T01:00:00Z")));
  ok("quiet hours: 12:00 Madrid makes sound", !isQuietHours(new Date("2026-11-27T11:00:00Z")));

  // Leave the wanted lists as they were.
  for (const u of [ana, marcos, laura]) await removeWanted(u, col.id, "F27");
  await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, laura));

  console.log(failures === 0 ? "\nAll notification checks passed" : `\n${failures} notification check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Telegram channel against the LOCAL stack with a fake Bot API (fetch is
 * replaced): linking, /stop, error handling and an end-to-end notification.
 * Run: npm run local:check. Never calls Telegram, never touches the cloud.
 */
import { and, eq, gte } from "drizzle-orm";

import { getDb } from "../src/db";
import {
  collections,
  events,
  listings,
  notificationDeliveries,
  notificationDestinations,
  profiles,
} from "../src/db/schema";
import { classify, telegramChannel, telegramText } from "../src/server/notifications/channels/telegram";
import { handleTelegramUpdate } from "../src/server/notifications/channels/telegram-bot";
import { deliver, fanOut } from "../src/server/notifications/dispatch";
import { createLinkToken } from "../src/server/notifications/linking";
import { makeOffer, publishListings } from "../src/server/trading";

if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run against a non-local database");
}
process.env.TELEGRAM_BOT_TOKEN = "123:fake";
process.env.TELEGRAM_BOT_USERNAME = "cromodex_test_bot";
process.env.NOTIFICATIONS_CONSOLE = "0";

// Fake Bot API: records calls, answers with the next queued response.
type Call = { method: string; body: Record<string, unknown> };
const calls: Call[] = [];
const answers: unknown[] = [];
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const method = String(input).split("/").pop() ?? "";
  calls.push({ method, body: JSON.parse(String(init?.body ?? "{}")) });
  const answer = answers.shift() ?? { ok: true, result: {} };
  return new Response(JSON.stringify(answer), { headers: { "content-type": "application/json" } });
}) as typeof fetch;

let failures = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}
const lastReply = () => String(calls.at(-1)?.body.text ?? "");
const update = (chatId: number, text: string, type = "private") => ({
  update_id: 1,
  message: { chat: { id: chatId, type }, text },
});

async function main() {
  const db = getDb();
  const users = await db.select().from(profiles);
  const ana = users.find((u) => u.displayName.startsWith("Ana"))!.id;
  const marcos = users.find((u) => u.displayName.startsWith("Marcos"))!.id;
  const destination = async (userId: string) =>
    (
      await db
        .select()
        .from(notificationDestinations)
        .where(and(eq(notificationDestinations.userId, userId), eq(notificationDestinations.channel, "telegram")))
    )[0];
  await db.delete(notificationDestinations).where(eq(notificationDestinations.channel, "telegram"));

  // --- linking
  const token = await createLinkToken(ana, "telegram");
  ok("link URL is a t.me deep link", telegramChannel.linkUrl!(token) === `https://t.me/cromodex_test_bot?start=${token}`);
  await handleTelegramUpdate(update(111, `/start ${token}`));
  ok("/start with a valid code links the chat", (await destination(ana))?.address === "111");
  ok("the bot confirms with the member's name", lastReply().includes("¡Listo, Ana"), lastReply());

  await handleTelegramUpdate(update(222, `/start ${token}`));
  ok("a used code is refused", (await destination(ana))?.address === "111" && lastReply().includes("no es válido"));

  await handleTelegramUpdate(update(333, `/start ${await createLinkToken(marcos, "telegram")}`, "group"));
  ok("group chats are ignored", !(await destination(marcos)));

  await handleTelegramUpdate(update(444, "hola"));
  ok("any other text gets help", lastReply().includes("Conectar Telegram"));

  const t2 = await createLinkToken(marcos, "telegram");
  await handleTelegramUpdate(update(555, `/start ${t2}`));
  await handleTelegramUpdate(update(555, "/stop"));
  ok("/stop unlinks the chat", !(await destination(marcos)) && lastReply().includes("ya no recibirás"));

  // --- send: answers mapped to what the dispatcher should do
  ok("200 → sent", classify({ ok: true }) === "sent");
  ok("403 blocked → gone", classify({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }) === "gone");
  ok("400 chat not found → gone", classify({ ok: false, error_code: 400, description: "Bad Request: chat not found" }) === "gone");
  ok("429 → retry", classify({ ok: false, error_code: 429 }) === "retry");
  ok("other 400 → failed", classify({ ok: false, error_code: 400, description: "Bad Request: can't parse entities" }) === "failed");
  ok("text is HTML-escaped", telegramText({ title: "<b>x</b>", body: "a & b", url: "https://x.test" }).includes("&lt;b&gt;x&lt;/b&gt;"));

  // --- end to end: Marcos offers on Ana's card, Ana's Telegram gets it
  const [col] = await db.select().from(collections).where(eq(collections.slug, "rumbo-a-egghead"));
  await fanOut();
  while ((await deliver()) > 0);
  const start = new Date();
  await publishListings({ userId: ana, collectionId: col.id, slug: "rumbo-a-egghead", code: "F26", copies: 1 });
  const [listing] = (await db.select().from(listings).where(eq(listings.ownerId, ana))).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  await makeOffer({ userId: marcos, slug: "rumbo-a-egghead", listingId: listing.id, cards: ["7", "F1"] });
  await fanOut();
  calls.length = 0;
  const sent = await deliver();
  const message = calls.find((c) => c.method === "sendMessage");
  ok("the offer reaches Ana's chat", sent === 1 && message?.body.chat_id === "111", `sent ${sent}`);
  ok("it says what is offered", String(message?.body.text).includes("Nueva oferta por tu F26") && String(message?.body.text).includes("7 y F1"));
  ok("silent flag is set", typeof message?.body.disable_notification === "boolean");

  // A blocked bot unlinks the member and fails the delivery.
  answers.push({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" });
  await makeOffer({ userId: marcos, slug: "rumbo-a-egghead", listingId: listing.id, cards: ["8"] });
  await fanOut();
  await deliver();
  const [failed] = await db
    .select({ status: notificationDeliveries.status, error: notificationDeliveries.lastError })
    .from(notificationDeliveries)
    .innerJoin(events, eq(events.id, notificationDeliveries.eventId))
    .where(and(gte(events.createdAt, start), eq(notificationDeliveries.channel, "telegram"), eq(notificationDeliveries.status, "failed")));
  ok("a blocked bot unlinks and fails the delivery", !(await destination(ana)) && failed?.error === "recipient gone", failed?.error ?? "none");

  console.log(failures === 0 ? "\nAll telegram checks passed" : `\n${failures} telegram check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

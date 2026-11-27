import "server-only";

import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  events,
  notificationDeliveries,
  notificationDestinations,
  notificationPreferences,
} from "@/db/schema";

import { activeChannels, getChannel } from "./channels";
import { renderMessage, renderWantedBatch } from "./messages";
import { notificationsFor } from "./rules";
import { topicOf, type Message } from "./types";

/*
 * Two steps, both safe to run concurrently (SKIP LOCKED):
 *  1. fan out: pending events → one delivery per member and channel;
 *  2. deliver: send pending deliveries, retry with backoff, drop gone ones.
 * See docs/notifications.md.
 */

const BATCH = 50;
const MAX_ATTEMPTS = 6;
/** While a delivery is being sent, others skip it for this long. */
const LEASE_MINUTES = 5;

/** Stored with each delivery: the message plus what batching needs. */
type StoredMessage = Message & { slug: string; code?: string };

/** Runs both steps; never throws (it runs after responses and on a schedule). */
export async function dispatchNotifications(): Promise<{ fannedOut: number; sent: number }> {
  try {
    const fannedOut = await fanOut();
    // Without channels there is nothing to deliver (events are still marked
    // dispatched, so enabling a channel later sends no backlog).
    if (activeChannels().length === 0) return { fannedOut, sent: 0 };
    const sent = await deliver();
    return { fannedOut, sent };
  } catch (error) {
    console.error("[notifications] dispatch failed", error);
    return { fannedOut: 0, sent: 0 };
  }
}

/** Step 1. Returns how many deliveries were created. */
export async function fanOut(): Promise<number> {
  const channels = activeChannels();
  return getDb().transaction(async (tx) => {
    const pending = await tx
      .select({ id: events.id, type: events.type, payload: events.payload })
      .from(events)
      .where(isNull(events.dispatchedAt))
      .orderBy(asc(events.createdAt))
      .limit(BATCH)
      .for("update", { skipLocked: true });
    if (pending.length === 0) return 0;

    let created = 0;
    for (const event of pending) {
      const notices = await notificationsFor(tx, event);
      const userIds = [...new Set(notices.map((n) => n.userId))];
      if (userIds.length === 0 || channels.length === 0) continue;

      const [prefs, destinations] = await Promise.all([
        tx
          .select()
          .from(notificationPreferences)
          .where(inArray(notificationPreferences.userId, userIds)),
        tx
          .select()
          .from(notificationDestinations)
          .where(inArray(notificationDestinations.userId, userIds)),
      ]);

      for (const notice of notices) {
        const off = prefs.some(
          (p) => p.userId === notice.userId && p.topic === topicOf(notice.kind) && !p.enabled,
        );
        if (off) continue;
        const message: StoredMessage = {
          ...renderMessage(notice),
          slug: notice.slug,
          ...("code" in notice ? { code: notice.code } : {}),
        };
        for (const channel of channels) {
          const linked =
            channel.implicit ||
            destinations.some((d) => d.userId === notice.userId && d.channel === channel.id);
          if (!linked) continue;
          const inserted = await tx
            .insert(notificationDeliveries)
            .values({
              eventId: event.id,
              userId: notice.userId,
              channel: channel.id,
              kind: notice.kind,
              message,
            })
            .onConflictDoNothing()
            .returning({ id: notificationDeliveries.id });
          created += inserted.length;
        }
      }
    }

    await tx
      .update(events)
      .set({ dispatchedAt: new Date() })
      .where(inArray(events.id, pending.map((e) => e.id)));
    return created;
  });
}

type Claimed = typeof notificationDeliveries.$inferSelect;

/** Step 2. Returns how many messages were sent. */
export async function deliver(): Promise<number> {
  const db = getDb();
  const claimed: Claimed[] = await db.transaction(async (tx) => {
    const due = await tx
      .select({ id: notificationDeliveries.id })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.status, "pending"),
          lte(notificationDeliveries.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(asc(notificationDeliveries.createdAt))
      .limit(BATCH)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];
    return tx
      .update(notificationDeliveries)
      .set({ nextAttemptAt: sql`now() + make_interval(mins => ${LEASE_MINUTES})` })
      .where(inArray(notificationDeliveries.id, due.map((d) => d.id)))
      .returning();
  });
  if (claimed.length === 0) return 0;

  // "Wanted" notices for the same member and channel go out as one message.
  const groups = new Map<string, Claimed[]>();
  for (const d of claimed) {
    const key = d.kind === "wanted.available" ? `wanted|${d.userId}|${d.channel}` : d.id;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }

  const silent = isQuietHours(new Date());
  let sent = 0;
  for (const group of groups.values()) {
    const first = group[0];
    const ids = group.map((d) => d.id);
    const stored = group.map((d) => d.message as StoredMessage);
    const message: Message =
      first.kind === "wanted.available"
        ? renderWantedBatch(
            stored.map((m) => ({ code: m.code ?? "", url: m.url })),
            stored[0].slug,
          )
        : stored[0];

    const channel = getChannel(first.channel);
    if (!channel) {
      await fail(ids, "channel not configured");
      continue;
    }
    const address = channel.implicit ? first.userId : await addressOf(first.userId, channel.id);
    if (!address) {
      await fail(ids, "not linked");
      continue;
    }

    let result: Awaited<ReturnType<typeof channel.send>>;
    let error = "";
    try {
      result = await channel.send(address, message, { silent });
    } catch (e) {
      result = "retry";
      error = e instanceof Error ? e.message : String(e);
    }

    if (result === "sent") {
      sent++;
      await db
        .update(notificationDeliveries)
        .set({ status: "sent", sentAt: new Date(), attempts: first.attempts + 1 })
        .where(inArray(notificationDeliveries.id, ids));
    } else if (result === "gone") {
      await db
        .delete(notificationDestinations)
        .where(
          and(
            eq(notificationDestinations.userId, first.userId),
            eq(notificationDestinations.channel, channel.id),
          ),
        );
      await fail(ids, "recipient gone");
    } else {
      const attempts = first.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await fail(ids, error || "too many attempts");
      } else {
        // 1, 2, 4, 8, 16 minutes.
        await db
          .update(notificationDeliveries)
          .set({
            attempts,
            lastError: error || "retry",
            nextAttemptAt: sql`now() + make_interval(mins => ${2 ** (attempts - 1)})`,
          })
          .where(inArray(notificationDeliveries.id, ids));
      }
    }
  }
  return sent;
}

async function fail(ids: string[], reason: string) {
  await getDb()
    .update(notificationDeliveries)
    .set({ status: "failed", lastError: reason })
    .where(inArray(notificationDeliveries.id, ids));
}

async function addressOf(userId: string, channel: string) {
  const [row] = await getDb()
    .select({ address: notificationDestinations.address })
    .from(notificationDestinations)
    .where(
      and(
        eq(notificationDestinations.userId, userId),
        eq(notificationDestinations.channel, channel),
      ),
    );
  return row?.address ?? null;
}

const madridHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  hour: "numeric",
  hourCycle: "h23",
});

/** 23:00–09:00 in Spain: deliver without sound. */
export function isQuietHours(now: Date): boolean {
  const hour = Number(madridHour.format(now));
  return hour >= 23 || hour < 9;
}

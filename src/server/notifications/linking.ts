import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { channelLinkTokens, notificationDestinations } from "@/db/schema";

/*
 * Linking a member to a channel with a one-time code, for any channel.
 * Only the SHA-256 of a code is stored; codes last 15 minutes.
 */

const TTL_MINUTES = 15;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** New code for `userId` on `channel`. 32 url-safe characters. */
export async function createLinkToken(userId: string, channel: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await getDb()
    .insert(channelLinkTokens)
    .values({
      tokenHash: hash(token),
      userId,
      channel,
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    });
  return token;
}

/** Uses a code once; returns its member, or null if wrong, used or expired. */
export async function consumeLinkToken(token: string, channel: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await getDb()
    .update(channelLinkTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(channelLinkTokens.tokenHash, hash(token)),
        eq(channelLinkTokens.channel, channel),
        isNull(channelLinkTokens.usedAt),
        gt(channelLinkTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: channelLinkTokens.userId });
  return row?.userId ?? null;
}

/**
 * Stores where `userId` receives on `channel`. An address belongs to one
 * member: linking it to another account moves it.
 */
export async function linkDestination(userId: string, channel: string, address: string) {
  await getDb().transaction(async (tx) => {
    await tx
      .delete(notificationDestinations)
      .where(
        and(eq(notificationDestinations.channel, channel), eq(notificationDestinations.address, address)),
      );
    await tx
      .insert(notificationDestinations)
      .values({ userId, channel, address })
      .onConflictDoUpdate({
        target: [notificationDestinations.userId, notificationDestinations.channel],
        set: { address, createdAt: new Date() },
      });
  });
}

export async function unlinkUser(userId: string, channel: string) {
  await getDb()
    .delete(notificationDestinations)
    .where(and(eq(notificationDestinations.userId, userId), eq(notificationDestinations.channel, channel)));
}

/** Unlinks whoever uses `address` (e.g. /stop from that chat). */
export async function unlinkAddress(channel: string, address: string) {
  const removed = await getDb()
    .delete(notificationDestinations)
    .where(
      and(eq(notificationDestinations.channel, channel), eq(notificationDestinations.address, address)),
    )
    .returning({ userId: notificationDestinations.userId });
  return removed.length > 0;
}

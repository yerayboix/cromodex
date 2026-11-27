import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { notificationDestinations, notificationPreferences } from "@/db/schema";

import { activeChannels } from "./channels";
import type { Topic } from "./types";

/*
 * A member's notification settings, for "Tu cuenta". Lists only channels a
 * member can link (configured, with a link flow), so a new channel shows up
 * here without UI changes.
 */

export type ChannelSetting = { id: string; label: string; linked: boolean };

export type NotificationSettings = {
  channels: ChannelSetting[];
  topics: Record<Topic, boolean>;
};

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const linkable = activeChannels().filter((c) => !c.implicit && c.linkUrl);
  if (linkable.length === 0) return { channels: [], topics: { trades: true, wanted: true } };

  const db = getDb();
  const [destinations, prefs] = await Promise.all([
    db
      .select({ channel: notificationDestinations.channel })
      .from(notificationDestinations)
      .where(eq(notificationDestinations.userId, userId)),
    db
      .select({ topic: notificationPreferences.topic, enabled: notificationPreferences.enabled })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId)),
  ]);
  const topic = (t: Topic) => prefs.find((p) => p.topic === t)?.enabled ?? true;
  return {
    channels: linkable.map((c) => ({
      id: c.id,
      label: c.label,
      linked: destinations.some((d) => d.channel === c.id),
    })),
    topics: { trades: topic("trades"), wanted: topic("wanted") },
  };
}

export async function setTopic(userId: string, topic: Topic, enabled: boolean) {
  await getDb()
    .insert(notificationPreferences)
    .values({ userId, topic, enabled })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.topic],
      set: { enabled },
    });
}

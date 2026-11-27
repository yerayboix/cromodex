"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getChannel } from "@/server/notifications/channels";
import { createLinkToken, unlinkUser } from "@/server/notifications/linking";
import { setTopic } from "@/server/notifications/settings";
import type { Topic } from "@/server/notifications/types";

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type DisplayNameState = { error?: string; saved?: boolean };

const MAX_NAME = 30;

export async function updateDisplayName(
  _prev: DisplayNameState,
  formData: FormData,
): Promise<DisplayNameState> {
  const user = await getCurrentUser();
  const name = String(formData.get("displayName") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return { error: "Escribe un nombre." };
  if (name.length > MAX_NAME) {
    return { error: `Como mucho ${MAX_NAME} caracteres.` };
  }
  await getDb()
    .update(profiles)
    .set({ displayName: name })
    .where(eq(profiles.id, user.id));
  refresh();
  return { saved: true };
}

// --------------------------------------------------------- notifications

/** One-time link to connect a channel (e.g. t.me/<bot>?start=<code>). */
export async function startChannelLink(channelId: string): Promise<{ url?: string; error?: string }> {
  const user = await getCurrentUser();
  const channel = getChannel(channelId);
  if (!channel?.linkUrl || channel.implicit) return { error: "Este canal no está disponible." };
  const token = await createLinkToken(user.id, channel.id);
  return { url: channel.linkUrl(token) };
}

export async function unlinkChannel(channelId: string) {
  const user = await getCurrentUser();
  await unlinkUser(user.id, channelId);
  refresh();
}

const TOPICS: readonly Topic[] = ["trades", "wanted"];

export async function setNotificationTopic(topic: Topic, enabled: boolean) {
  const user = await getCurrentUser();
  if (!TOPICS.includes(topic)) return;
  await setTopic(user.id, topic, enabled);
  refresh();
}

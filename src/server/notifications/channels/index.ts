import { consoleChannel } from "./console";
import type { NotificationChannel } from "./types";

/** Every channel the app knows. Register new ones here. */
const ALL: NotificationChannel[] = [consoleChannel];

/** Channels whose configuration is present in this environment. */
export function activeChannels(): NotificationChannel[] {
  return ALL.filter((c) => c.isConfigured());
}

export function getChannel(id: string): NotificationChannel | undefined {
  return activeChannels().find((c) => c.id === id);
}

export type { NotificationChannel, SendResult } from "./types";

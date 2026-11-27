import { consoleChannel } from "./console";
import { telegramChannel } from "./telegram";
import type { NotificationChannel } from "./types";

/** Every channel the app knows. Register new ones here. */
const ALL: NotificationChannel[] = [consoleChannel, telegramChannel];

/** Channels whose configuration is present in this environment. */
export function activeChannels(): NotificationChannel[] {
  return ALL.filter((c) => c.isConfigured());
}

export function getChannel(id: string): NotificationChannel | undefined {
  return activeChannels().find((c) => c.id === id);
}

export type { NotificationChannel, SendOutcome, SendResult } from "./types";

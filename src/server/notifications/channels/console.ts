import type { NotificationChannel } from "./types";

/**
 * Writes messages to the server log. On by default in development (and when
 * NOTIFICATIONS_CONSOLE=1), so the whole pipeline runs without any service.
 */
export const consoleChannel: NotificationChannel = {
  id: "console",
  implicit: true,
  isConfigured() {
    return (
      process.env.NOTIFICATIONS_CONSOLE === "1" ||
      (process.env.NODE_ENV === "development" && process.env.NOTIFICATIONS_CONSOLE !== "0")
    );
  },
  async send(address, message, { silent }) {
    console.info(
      `[notification:console] to=${address}${silent ? " (silent)" : ""}\n  ${message.title}\n  ${message.body}\n  ${message.url}`,
    );
    return "sent";
  },
};

import type { Message } from "../types";
import type { NotificationChannel, SendOutcome, SendResult } from "./types";

/*
 * Telegram Bot API channel. Env: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME
 * (without @) and TELEGRAM_WEBHOOK_SECRET (for incoming updates).
 * A member's address is their private chat id with the bot.
 */

export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const username = (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
  return { token, username, webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "" };
}

type ApiResponse = { ok: boolean; error_code?: number; description?: string; result?: unknown };

/** Calls a Bot API method. Never throws for API errors; returns them. */
export async function telegramApi(method: string, body: unknown): Promise<ApiResponse> {
  const { token } = telegramConfig();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  try {
    return (await res.json()) as ApiResponse;
  } catch {
    return { ok: false, error_code: res.status, description: res.statusText };
  }
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Telegram only accepts public https URLs in buttons. */
function buttonUrl(url: string) {
  return /^https:\/\//.test(url) && !/\/\/(localhost|127\.0\.0\.1)/.test(url);
}

export function telegramText(message: Message) {
  const lines = [`<b>${escapeHtml(message.title)}</b>`, escapeHtml(message.body)];
  // Without a button (local URLs), put the link in the text.
  if (!buttonUrl(message.url)) lines.push(escapeHtml(message.url));
  return lines.join("\n");
}

/** Maps a Bot API answer to what the dispatcher should do. */
export function classify(response: ApiResponse): SendResult {
  if (response.ok) return "sent";
  const code = response.error_code ?? 0;
  const text = (response.description ?? "").toLowerCase();
  // Blocked by the user, chat deleted or never started: unlink.
  if (code === 403 || text.includes("chat not found") || text.includes("user is deactivated")) {
    return "gone";
  }
  if (code === 429 || code >= 500 || code === 0) return "retry";
  return "failed";
}

export const telegramChannel: NotificationChannel = {
  id: "telegram",
  isConfigured() {
    const { token, username } = telegramConfig();
    return Boolean(token && username);
  },
  async send(address, message, { silent }): Promise<SendOutcome> {
    const response = await telegramApi("sendMessage", {
      chat_id: address,
      text: telegramText(message),
      parse_mode: "HTML",
      disable_notification: silent,
      link_preview_options: { is_disabled: true },
      ...(buttonUrl(message.url)
        ? { reply_markup: { inline_keyboard: [[{ text: "Abrir en cromodex", url: message.url }]] } }
        : {}),
    });
    const result = classify(response);
    return result === "sent"
      ? { result }
      : { result, error: `telegram ${response.error_code ?? "?"}: ${response.description ?? "no description"}` };
  },
  linkUrl(token) {
    return `https://t.me/${telegramConfig().username}?start=${token}`;
  },
};

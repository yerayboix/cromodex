import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { telegramConfig } from "@/server/notifications/channels/telegram";
import { handleTelegramUpdate } from "@/server/notifications/channels/telegram-bot";

/**
 * Telegram sends bot updates here (set with `npm run telegram:webhook`).
 * Public in the proxy; authenticated by the secret Telegram echoes in the
 * X-Telegram-Bot-Api-Secret-Token header.
 */
export async function POST(request: NextRequest) {
  const { webhookSecret } = telegramConfig();
  const given = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!webhookSecret || !sameSecret(given, webhookSecret)) {
    return new NextResponse(null, { status: 401 });
  }
  try {
    await handleTelegramUpdate(await request.json());
  } catch (error) {
    // Answer 200 anyway: Telegram would retry the same update forever.
    console.error("[telegram] update failed", error);
  }
  return NextResponse.json({ ok: true });
}

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

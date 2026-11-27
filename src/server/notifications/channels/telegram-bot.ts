import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { profiles } from "@/db/schema";

import { consumeLinkToken, linkDestination, unlinkAddress } from "../linking";
import { appUrl } from "../messages";
import { escapeHtml, telegramApi } from "./telegram";

/*
 * What the bot does with incoming messages (webhook in production, polling
 * locally). Private chats only:
 *  /start <code>  links the chat to the member who generated the code;
 *  /stop          unlinks it;
 *  anything else  short help.
 */

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    chat?: { id?: number; type?: string };
    text?: string;
  };
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const chat = update.message?.chat;
  const text = (update.message?.text ?? "").trim();
  if (!chat?.id || chat.type !== "private") return;
  const chatId = String(chat.id);

  const [command, argument = ""] = text.split(/\s+/, 2);

  if (command === "/start" && argument) {
    const userId = await consumeLinkToken(argument, "telegram");
    if (!userId) {
      await reply(
        chatId,
        "Este enlace para conectar no es válido o ha caducado. Vuelve a pulsar «Conectar Telegram» en Tu cuenta de cromodex.",
      );
      return;
    }
    await linkDestination(userId, "telegram", chatId);
    const [profile] = await getDb()
      .select({ name: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, userId));
    await reply(
      chatId,
      `¡Listo${profile ? `, ${profile.name}` : ""}! A partir de ahora te avisaré aquí de tus ofertas y de las cartas que buscas. Para dejar de recibir avisos, escribe /stop.`,
    );
    return;
  }

  if (command === "/stop") {
    const removed = await unlinkAddress("telegram", chatId);
    await reply(
      chatId,
      removed
        ? "Hecho: ya no recibirás avisos aquí. Puedes volver a conectarte desde Tu cuenta en cromodex."
        : "Este chat no estaba conectado a ninguna cuenta de cromodex.",
    );
    return;
  }

  await reply(
    chatId,
    `Soy el bot de avisos de cromodex. Para recibirlos aquí, entra en ${appUrl()} y pulsa «Conectar Telegram» en Tu cuenta.`,
  );
}

async function reply(chatId: string, text: string) {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: escapeHtml(text),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

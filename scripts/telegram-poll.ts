/**
 * Local development: reads the bot's messages with getUpdates and handles
 * them like the webhook would, so linking works without a public URL.
 * Use a separate test bot: a bot with a webhook (production) is refused.
 * Run: npm run telegram:poll
 */
import { telegramApi } from "../src/server/notifications/channels/telegram";
import {
  handleTelegramUpdate,
  type TelegramUpdate,
} from "../src/server/notifications/channels/telegram-bot";

if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Polling is for the local stack only");
}

async function main() {
  const info = await telegramApi("getWebhookInfo", {});
  const webhook = (info.result as { url?: string } | undefined)?.url;
  if (webhook) {
    throw new Error(`This bot has a webhook (${webhook}); use a separate test bot locally`);
  }

  console.log("Polling Telegram updates. Ctrl+C to stop.");
  let offset = 0;
  for (;;) {
    const res = await telegramApi("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message"],
    });
    const updates = (res.result as (TelegramUpdate & { update_id: number })[] | undefined) ?? [];
    for (const update of updates) {
      offset = update.update_id + 1;
      await handleTelegramUpdate(update).catch((e) => console.error("update failed", e));
    }
    if (!res.ok) await new Promise((r) => setTimeout(r, 3000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Points the bot's webhook at the deployed app. Run once after creating the
 * bot (or when the domain or secret change), with the production values in
 * the environment: npm run telegram:webhook
 */
import { telegramApi, telegramConfig } from "../src/server/notifications/channels/telegram";

const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
const { token, webhookSecret } = telegramConfig();
if (!token || !webhookSecret || !/^https:\/\//.test(appUrl)) {
  throw new Error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and an https APP_URL first");
}

async function main() {
  const url = `${appUrl}/api/telegram/webhook`;
  const res = await telegramApi("setWebhook", {
    url,
    secret_token: webhookSecret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  console.log(res.ok ? `Webhook set to ${url}` : `Failed: ${res.description}`);
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

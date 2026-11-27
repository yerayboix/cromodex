# Notifications

Members get a short message when something needs their answer or something of
theirs was closed. Delivery is **pluggable**: Telegram is one channel; another
(web push, email…) plugs in without touching what is notified or to whom.

## Layers

```
Actions (offer, accept…)
   │  already in place: every mutation writes a domain event to app.events
   ▼
1. RULES      who gets what, from each event          (channel-agnostic)
   ▼
2. MESSAGES   neutral Spanish text: title, body, link (channel-agnostic)
   ▼
3. CHANNELS   delivery                                telegram │ console │ …
```

Code lives in `src/server/notifications/`.

### 1. Rules (`rules.ts`)

| Event | Recipient | Notification |
| --- | --- | --- |
| `negotiation.offered` | listing owner | new offer on your card |
| `negotiation.countered` | the side whose turn it now is | counter-offer received |
| `trade.accepted` | the side that did **not** accept | trade done (names allowed, as in the log) |
| `negotiation.rejected` | the other side | your offer is closed: rejected |
| `negotiation.withdrawn` | the offerer, only when the owner left | your offer is closed: owner withdrew |
| `negotiation.cancelled` | the offerer | your offer is closed: card traded, withdrawn or cards given elsewhere |
| `listing.created` | members with that code in their wanted list (not the publisher) | a card you want is on the table (batched) |

Always: never notify the actor, respect each member's topics, and never reveal
who offers or who owns a card. Names appear only in "trade done".

Topics a member can switch off: `trades` (everything above except wanted) and
`wanted`. Both on by default.

### 2. Messages (`messages.ts`)

A `Notification` becomes a `Message { title, body, url }` in Spanish. Every
channel sends the same words; channels only format them.

### 3. Channels (`channels/`)

```ts
interface NotificationChannel {
  id: string;                       // "telegram", "console"…
  isConfigured(): boolean;          // its env vars are present
  send(address: string, message: Message, opts: { silent: boolean }):
    Promise<"sent" | "retry" | "gone">;   // gone = user blocked/unlinked
  linkUrl?(token: string): string;  // how a member connects this channel
}
```

Adding a channel = implement this interface and register it. `console` logs
messages; it is the default locally and proves the seam.

## Data (`app` schema)

- `notification_destinations (user_id, channel, address)` — where each member
  receives on each channel (Telegram: chat id).
- `notification_preferences (user_id, topic, enabled)` — missing row = enabled.
- `channel_link_tokens (token_hash, user_id, channel, expires_at, used_at)` —
  one-time codes to link a channel; only the hash is stored; 15 min.
- `notification_deliveries (event_id, user_id, channel, kind, message, status,
  attempts, next_attempt_at, last_error, sent_at)` — unique per
  (event, user, channel, kind), so retries never duplicate a message.

## Dispatcher (`dispatch.ts`)

1. **Fan out**: claim pending events (`dispatched_at is null`, `for update skip
   locked`), apply the rules, insert deliveries, mark the events dispatched —
   one transaction.
2. **Deliver**: send pending deliveries through their channel. `retry` backs
   off; `gone` removes the destination. Wanted deliveries for the same member
   are merged into one message.

Runs right after each action (`after()` from `next/server`, so the user does
not wait) and every few minutes from a Dokploy schedule calling
`POST /api/notifications/dispatch` with a secret (`Authorization: Bearer
NOTIFICATIONS_CRON_SECRET`), for retries and batching.
Quiet hours: 23:00–09:00 Europe/Madrid, messages arrive without sound.

## Telegram

- Bot from @BotFather. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
  `TELEGRAM_WEBHOOK_SECRET`.
- Send: `sendMessage` with an "Abrir carta" button; silent at night.
- Link: *Tu cuenta* → "Conectar Telegram" → `t.me/<bot>?start=<token>` → the
  webhook stores the chat id and the bot confirms. `/stop` or *Desconectar*
  unlinks.
- Webhook: `/api/telegram/webhook`, public in the proxy, authenticated by the
  `X-Telegram-Bot-Api-Secret-Token` header.
- Local: `npm run telegram:poll` reads updates with `getUpdates` and feeds the
  same handler, so no public URL is needed.

Messages travel through Telegram's servers: they carry card codes and a link,
nothing else.

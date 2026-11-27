<div align="center">

# cromodex

**An anonymous sticker-trading table for a small group of friends.**

Publish your duplicates, receive offers without knowing who makes them,
counter-offer until you agree, and only then find out who you traded with.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-Postgres-c5f74f?logo=drizzle)
![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_Postgres-3ecf8e?logo=supabase)

</div>

> The app's interface is in **Spanish**; code, comments and documentation are in **English**.

---

## Contents

- [What it is](#what-it-is)
- [Features](#features)
- [How a trade works](#how-a-trade-works)
- [Tech stack](#tech-stack)
- [Getting started (local, no cloud account)](#getting-started-local-no-cloud-account)
- [Working against a Supabase cloud project](#working-against-a-supabase-cloud-project)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Notifications](#notifications)
- [Project structure](#project-structure)
- [Database and migrations](#database-and-migrations)
- [Adding a collection or a theme](#adding-a-collection-or-a-theme)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## What it is

cromodex is a trading board for a closed group (it was built for six friends).
Everyone puts their duplicate stickers on a shared **table**; anyone can make an
offer on any card using **card codes only**; owner and offerer go back and forth
until one of them accepts or rejects. Everything is **anonymous** until a deal
is accepted: only then are both names written to the public **trade log**.

The first collection is **One Piece — Rumbo a Egghead** (Panini, 204 stickers:
`1`–`177` and `F1`–`F27`), with a One Piece theme. The data model and themes are
per collection, so more can be added without structural changes.

## Features

- **The table** — every copy is its own card (publishing 3 copies creates 3
  cards). Filter by *Me faltan* to see only cards from your wanted list.
- **Anonymous negotiations** — each negotiation gets an alias (*Oferta A*,
  *Oferta B*…); nobody can tell whether two offers come from the same person.
- **Offers and counter-offers** — turn-based, codes only, repeated codes allowed.
  Codes are validated against the collection on the client and on the server.
- **Safe accept** — one transaction closes the deal, cancels the other offers on
  that card and the offerer's other offers that hand over the same cards, with an
  explicit irreversible warning before it happens.
- **Mis tratos, Buscadas, Registro** — your open negotiations by whose turn it is,
  your wanted list (and how many people want each card, never who), and the
  public log of closed trades.
- **Notifications** — Telegram messages when it is your turn, a deal closes or a
  card you want reaches the table. Pluggable: other channels can be added.
- **Invitations** — members are invited by email from Supabase and choose their
  own name and password.
- **Phone and desktop** — bottom tabs and full-screen panels on phones; sidebar
  and a card panel next to the board on desktop.
- **Per-collection themes** — the One Piece theme ships with an animated
  iridescent frame for special cards (respects *reduced motion*).

## How a trade works

```
 Owner publishes card 88 ──► the table shows "88" (no owner)
                                   │
 Someone offers 45 + F12 ──► Oferta A, owner's turn
                                   │
             owner: accept │ counter (ask 45 + 15) │ reject
                                   │
 Offerer's turn ──► accept │ counter │ reject
                                   │
                ACCEPTED ──► trade log: "Marcos ⇄ Ana · 88 for 45 + 15"
                             other offers on 88 cancelled
                             Ana's other offers giving 45 or 15 cancelled
```

Anonymity is enforced on the server: the browser never receives another user's
id. Reads return view models relative to the viewer (`isMine`, aliases), and
names only come from the trade log. See [docs/architecture.md](docs/architecture.md).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions, Cache Components) |
| UI | React 19, Tailwind CSS 4, shadcn/ui primitives, lucide icons |
| Database | PostgreSQL 17 on [Supabase](https://supabase.com), dedicated `app` schema with RLS on and no policies |
| ORM / migrations | [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit |
| Auth | Supabase Auth (email + password, invitations) through `@supabase/ssr`, server-side only |
| Notifications | Outbox table + pluggable channels (Telegram Bot API) |
| Deploy | Docker (`output: "standalone"`), self-hosted with [Dokploy](https://dokploy.com) |

## Getting started (local, no cloud account)

Everything runs on your machine: a local Supabase stack in Docker (database,
auth and a test mailbox) and the Next.js dev server. Nothing touches a cloud
project.

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 26 | via [nvm](https://github.com/nvm-sh/nvm) recommended |
| npm | 11+ | ships with Node |
| Docker | Engine 24+ with Compose v2 | for the local Supabase stack |
| Bash | — | scripts use it; on Windows, develop inside **WSL2** (Ubuntu) |

The Supabase CLI is a dev dependency: no global install needed.

### 1. Install

```bash
git clone https://github.com/yerayboix/cromodex.git
cd cromodex
npm install
```

### 2. Start the local Supabase stack

```bash
npm run local:start      # first run pulls the Docker images (a few minutes)
```

### 3. Create the schema and the test users

```bash
npm run local:migrate    # applies drizzle/*.sql to the local database
npm run local:seed       # creates three test users
```

| Email | Password |
| --- | --- |
| `ana@cromodex.test` | see [`scripts/seed-local.mjs`](scripts/seed-local.mjs) |
| `marcos@cromodex.test` | 〃 |
| `laura@cromodex.test` | 〃 |

These exist only in your local stack.

### 4. Run the app

```bash
npm run local:dev        # http://localhost:3000  (PORT=3100 to change it)
```

Sign in as two of the test users (one in a private window) to publish a card,
make an offer, counter and accept.

| Local service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit (emails sent by Auth, e.g. invitations) | http://127.0.0.1:54324 |

In development, notifications are printed to the server log (the `console`
channel), so you can follow them without any bot.

To stop the stack: `npm run local:stop` (data is kept between runs).

> `scripts/local-env.sh` points the app at the local stack by overriding the
> environment. If your `.env.local` contains Telegram credentials, the local app
> will send **real** Telegram messages — leave them out for local work, or use a
> separate test bot (see [Notifications](#notifications)).

## Working against a Supabase cloud project

1. Create a Supabase project. In **Authentication**: disable public sign-ups,
   turn off email confirmation, and set the **Site URL** to where the app runs.
2. Copy [`.env.example`](.env.example) to `.env.local` and fill it in (see the
   table below). The app uses the **session pooler (port 5432)**.
3. Apply the migrations and run the app:

```bash
npm run db:migrate       # uses DIRECT_URL
npm run dev              # http://localhost:3000
```

4. Invite users from **Authentication → Users → Invite user**. The invitation
   link lands on the app, where they choose their name and password. Invitations
   work with Supabase's default email templates.

## Environment variables

`.env.local` is git-ignored; never commit real values. Full template:
[`.env.example`](.env.example).

| Variable | Required | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (Auth). Also a **build arg** in Docker. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable key, Auth only. Also a **build arg** in Docker. |
| `DATABASE_URL` | yes | Postgres for the app — Supabase **session pooler, port 5432** |
| `DIRECT_URL` | for migrations | Postgres for drizzle-kit (session pooler) |
| `SUPABASE_SECRET_KEY` | local seed only | Creating local test users; the app does not use it |
| `APP_URL` | for notifications | Public URL, used in notification links |
| `TELEGRAM_BOT_TOKEN` | optional | Enables the Telegram channel |
| `TELEGRAM_BOT_USERNAME` | optional | Bot username without `@` (deep links) |
| `TELEGRAM_WEBHOOK_SECRET` | with Telegram | Authenticates Telegram's calls to the webhook |
| `NOTIFICATIONS_CRON_SECRET` | with notifications | Bearer secret of the scheduled dispatch endpoint |
| `NOTIFICATIONS_CONSOLE` | optional | `1` forces the log channel, `0` disables it in development |

> Do not use the Supabase **transaction pooler** (port 6543) for `DATABASE_URL`:
> pages run several queries at once and it hangs on the pipelined queries the
> `postgres` driver sends.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server with `.env.local` |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (`DIRECT_URL`) |
| `npm run db:check` / `db:studio` | Check migrations / open Drizzle Studio |
| `npm run local:start` / `local:stop` | Start / stop the local Supabase stack |
| `npm run local:migrate` | Apply migrations to the local stack |
| `npm run local:seed` | Create the local test users |
| `npm run local:dev` | Dev server against the local stack |
| `npm run local:check` | Business-rule, notification and Telegram checks (local stack) |
| `npm run telegram:poll` | Local: read a **test** bot's messages without a public URL |
| `npm run telegram:webhook` | Production: point the bot's webhook at `APP_URL` |
| `npm run docker:up` / `docker:down` | Build and run the production image locally |

## Testing

```bash
npm run local:check
```

Runs three suites against the **local** stack (they refuse to run against any
other database):

- **Trading rules** — turns, ownership, invalid codes, two simultaneous accepts
  (exactly one wins), withdrawals, cancellations.
- **Notifications** — who is told what for each event, never the actor, topics
  switched off, anonymity of every message, batching, quiet hours.
- **Telegram** — linking with one-time codes, `/stop`, error handling, and an
  end-to-end notification, against a fake Bot API.

Type checking and linting: `npm run typecheck` (generates the route types Next.js
writes at build time, then runs `tsc`) and `npm run lint`.

## Notifications

Domain events are written to an outbox (`app.events`) in the same transaction
as each action. A dispatcher turns them into notifications:

```
events ──► rules (who, what) ──► messages (Spanish text) ──► channels (telegram, console, …)
```

- **Rules and messages are channel-agnostic.** A new channel (web push, email…)
  only implements one interface in `src/server/notifications/channels/` and is
  registered there; the settings screen lists it automatically.
- Members link Telegram from *Tu cuenta → Avisos* with a one-time `t.me` link,
  and can switch off *Mis ofertas y tratos* or *Cartas que busco*.
- Messages never say who offers or who owns a card; names appear only in "trade
  done", as in the public log. Between 23:00 and 09:00 (Madrid) they arrive
  silently.

Design: [docs/notifications.md](docs/notifications.md). Production setup (bot,
webhook, scheduled job): [docs/deploy.md §8](docs/deploy.md#8-notifications-telegram).

To try Telegram locally, create a separate test bot with @BotFather, put its
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` in your environment, run
`npm run telegram:poll` next to `npm run local:dev`, and connect it from
*Tu cuenta*.

## Project structure

```
src/
├── app/
│   ├── (app)/c/[slug]/          # a collection: themed shell, sidebar, tabs
│   │   ├── (board)/             # the table, kept mounted while a card is open
│   │   │   ├── cards/[id]/      # card panel, offer and counter composers
│   │   │   └── publish/
│   │   ├── trades/              # Mis tratos, and a closed trade
│   │   ├── wanted/              # Buscadas
│   │   ├── log/                 # Registro
│   │   └── actions.ts           # Server Actions of a collection
│   ├── (app)/set-password/      # after an invitation, or to change it
│   ├── api/telegram/webhook/    # Telegram updates
│   ├── api/notifications/dispatch/  # scheduled dispatch (bearer secret)
│   ├── auth/confirm/            # email links with a token hash
│   └── login/
├── components/                  # cards, board, dialogs, shell (nav, account)
├── db/                          # Drizzle schema and client
├── lib/                         # collections (codes, themes), paths, auth, format
├── proxy.ts                     # session refresh and route gating (Next 16 "proxy")
└── server/
    ├── queries.ts               # read models, relative to the viewer
    ├── trading.ts               # write side: one transaction per action
    └── notifications/           # rules, messages, dispatcher, channels
drizzle/                         # SQL migrations
scripts/                         # local env, seed, checks, Telegram helpers
supabase/                        # local stack config and email template
docs/                            # requirements, architecture, deploy, notifications
```

## Database and migrations

- Every table lives in the `app` schema, which the Supabase Data API does not
  expose. RLS is on with **no policies**, as a second barrier: only the server
  reads data, through Drizzle.
- Change `src/db/schema.ts`, then `npm run db:generate` creates a SQL migration
  in `drizzle/`. Apply it with `npm run local:migrate` (local) or
  `npm run db:migrate` (cloud). Custom SQL: `npx drizzle-kit generate --custom --name <name>`.
- Migrations never run when the container starts: apply them before deploying
  code that needs them.

## Adding a collection or a theme

1. Add the collection to `COLLECTIONS` in [`src/lib/collections.ts`](src/lib/collections.ts):
   slug, names, valid codes and its theme id.
2. Insert its row in `app.collections` with a migration (see
   `drizzle/0002_seed_rumbo_a_egghead.sql`).
3. For a new look, add a `[data-theme="<id>"]` block with the theme variables
   in [`src/app/globals.css`](src/app/globals.css).

## Deployment

The app ships as one Docker image (`output: "standalone"`, non-root, health
check on `/login`). `NEXT_PUBLIC_*` values are build arguments; everything else
is runtime environment. The image never needs the database while building.

```bash
npm run docker:up        # try the production image locally with .env.local
```

Step-by-step guide for Dokploy (application, variables, domain and HTTPS,
Supabase settings, notifications): [docs/deploy.md](docs/deploy.md).

## Documentation

| Document | Contents |
| --- | --- |
| [docs/requirements.md](docs/requirements.md) | What the product does and why |
| [docs/architecture.md](docs/architecture.md) | Data model, negotiation state machine, accept transaction, anonymity |
| [docs/notifications.md](docs/notifications.md) | Notification module design |
| [docs/deploy.md](docs/deploy.md) | Production deploy with Dokploy |

## Contributing

- **Language:** code, identifiers, routes, URL parameters, comments, docs and
  commit messages in English; only text shown to users in Spanish.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org) —
  `feat(trades): …`, `fix(ui): …`, `docs: …`.
- **Anonymity first:** never send another user's id to the client; read through
  `src/server/queries.ts`, write through `src/server/trading.ts`.
- **Next.js 16** differs from earlier versions (`proxy.ts`, Cache Components):
  read `node_modules/next/dist/docs/` before changing framework code.
- Before opening a pull request: `npm run typecheck`, `npm run lint`,
  `npm run build` and `npm run local:check`.

## License

No license has been chosen yet; until one is added, all rights are reserved.

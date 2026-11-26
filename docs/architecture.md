# Architecture — cromodex

Agreed technical decisions. Product requirements are in [requirements.md](requirements.md).

## 1. Principles

1. **Anonymity by design.** The browser **never** receives the `user_id` of someone else's listing or negotiation. All data access happens on the server.
2. **Accepting is atomic.** Closing a deal, marking the listing as traded, cancelling conflicts and recording events happen in **a single transaction**.
3. **Persisted events** (outbox) so notifications can be added later without touching the logic.
4. **Minimal scale** (6 users): a monolith, no queues or microservices.

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js (App Router) + TypeScript**, Server Components and Server Actions |
| UI | **Tailwind CSS + shadcn/ui**, mobile-first; UI copy in Spanish |
| Database | **Supabase Postgres 17** (single `cromodex` project, shared by development and production) |
| ORM / migrations | **Drizzle ORM** + drizzle-kit |
| Auth | **Supabase Auth** — email + password, via `@supabase/ssr` |
| Deploy | **Docker** (Next.js `output: "standalone"`) on a self-hosted VPS with **Dokploy** |
| Local environment | WSL2 Ubuntu 24.04, Node LTS (nvm), Docker Engine |

### Not used

- **The Supabase client for data access from the browser** (PostgREST / supabase-js `.from()`): a faulty policy would break anonymity. Supabase in the browser is **for Auth only**.
- **Supabase shadcn blocks** (`@supabase/supabase-client-nextjs` and similar): they access data from the client.
- **Supabase Storage / Realtime**: not needed for now.

## 3. Supabase

- **Single project** for development and production.
- **Auth:** email + password. Public sign-up **disabled**, email confirmation **disabled** (autoconfirm). The admin creates the 6 users by hand in *Authentication → Users*.
- **Dedicated `app` schema**: every application table lives there, **not exposed** through the Data API. On top of that, **RLS enabled with no policies** on every table as a second barrier.
- `auth.users` is managed by Supabase; `app.profiles` extends it with the display name.

### Environment variables (`.env.local`, never in git)

| Variable | Use |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project base URL (without `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` — public, for Auth in the browser |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` — server only (user admin) |
| `DATABASE_URL` | Session pooler, port **5432** — used by the app (the transaction pooler, 6543, hangs on the pipelined queries postgres.js sends) |
| `DIRECT_URL` | Session pooler, port **5432** — used by drizzle-kit for migrations |

The direct connection (IPv6) is not used: neither WSL nor the VPS is guaranteed to have IPv6.

## 4. Data model (`app` schema)

```
collections      (id uuid, slug, name)        -- card codes live in src/lib/collections.ts
profiles         (id uuid = auth.users.id, display_name)

listings         (id uuid, collection_id, owner_id, card_code,       -- 1 listing = 1 copy
                  status: active | withdrawn | traded,
                  created_at)

negotiations     (id uuid, listing_id, offerer_id,
                  alias,                                              -- "A", "B"… unique per listing
                  status: open | accepted | rejected | cancelled | withdrawn,
                  turn: owner | offerer,
                  created_at, closed_at)

proposals        (id uuid, negotiation_id, by: owner | offerer, seq,
                  cards text[],                                       -- what the offerer gives (repeats allowed)
                  created_at)

trades           (id uuid, negotiation_id, listing_id (unique),
                  owner_id, offerer_id,
                  owner_card, offerer_cards text[],
                  accepted_at)                                        -- public, immutable log

wanted           (user_id, collection_id, card_code)                  -- composite PK

events           (id uuid, type, payload jsonb, created_at, dispatched_at)   -- outbox
```

Notes:

- The author always gives **one copy of `listings.card_code`**; that side is not negotiated. Proposals only contain what the offerer gives.
- The **current proposal** is the one with the highest `seq`.
- **A listing is one copy**: listing N copies creates N independent `listings`. Each can be traded at most once (`trades.listing_id` is unique).
- **Card codes** for each collection live in `src/lib/collections.ts` (there is no `cards` table). It is a pure module: the client uses it to validate while typing and the server reuses the same validator before inserting. There is **no** check that the user owns the card.
- `trades` is independent from `negotiations` so the log is immutable.
- Every exposed ID is a **random UUID** (never sequential).
- `app.profiles` is filled by a **trigger on `auth.users`**: creating a user in Supabase creates their profile with `display_name` = the `display_name` metadata or, if missing, the local part of the email.
- The `anon` and `authenticated` roles have no `USAGE` on the `app` schema.
- The collection seed (just the `collections` row) is a regular migration (`drizzle/0002_seed_rumbo_a_egghead.sql`).

## 5. Negotiation — state machine

```
            offer (offerer)
  (none) ───────────────────► OPEN (turn = owner)
                                │
     counter (whoever has the turn) ─► OPEN (turn = the other side) ─► …
                                │
     accept   (whoever has the turn) ─► ACCEPTED   → creates trade, reveals names
     reject   (whoever has the turn) ─► REJECTED   → disappears
     withdraw (either side, if OPEN) ─► WITHDRAWN  → disappears
     conflict / listing withdrawn or traded ─► CANCELLED → disappears
```

- The author cannot make an offer on their own listing.
- Rejected, withdrawn and cancelled negotiations do **not** appear in the log.

## 6. Accepting a deal (transaction)

```
BEGIN
  SELECT negotiation … FOR UPDATE      -- status = open and it is the accepter's turn
  SELECT listing … FOR UPDATE          -- status = active
  INSERT trade (owner_id, offerer_id, owner_card, offerer_cards)
  UPDATE negotiation → accepted
  UPDATE listing → traded
  CANCEL the other OPEN negotiations on that listing
  CANCEL OPEN negotiations of the SAME offerer whose current proposal
     contains any of the codes handed over in this trade
  INSERT events (trade.accepted, negotiation.cancelled × N)
COMMIT
```

- Two simultaneous accepts on the same listing: `FOR UPDATE` serializes them; the second sees `status = traded` and fails cleanly (and the unique `trades.listing_id` also enforces it in the database).
- The UI shows the warning first (see requirements §5).

## 7. Anonymity — how it is enforced

- Every read goes through a **server-side query layer** that returns **DTOs** without `owner_id` / `offerer_id`. Instead:
  - `isMine: boolean` (to recognise your own items),
  - the negotiation's `alias`.
- Names only come from `trades` (the accepted-trades log).
- Wanted list: aggregates only (`code`, `count`), never who.
- **Anonymity test**: walks the server responses and fails if another user's `user_id` appears.

## 8. Events and notifications

- Every mutation inserts into `app.events` **within the same transaction** (outbox pattern).
- Planned types: `listing.created`, `listing.withdrawn`, `negotiation.offered`, `negotiation.countered`, `negotiation.rejected`, `negotiation.withdrawn`, `negotiation.cancelled`, `trade.accepted`.
- Later phase: a worker or cron reads `events WHERE dispatched_at IS NULL` and sends to Telegram (or another channel). Adding channels = adding consumers.

## 9. Real time

- Initially: refresh when the tab regains focus and every ~30 s.
- If needed: Server-Sent Events reading from `app.events`.

## 10. Deploy

Step by step: [deploy.md](deploy.md).

- `next.config` with `output: "standalone"`; **multi-stage Dockerfile** (deps → build → runner with `node server.js`).
- `NEXT_PUBLIC_*` variables as **build args** in Dokploy (they are inlined at build time) in addition to env vars.
- **Migrations** (drizzle-kit) as a separate step, not on container start.
- Dokploy: private repo via GitHub App, Dockerfile build, domain with HTTPS (Traefik).
- `docker-compose.yml` to test the production image locally.
- Once the production domain exists, add it in Supabase → *Authentication → URL Configuration → Redirect URLs*.

## 11. Development tools (Claude Code)

- **shadcn** and **next-devtools** MCP servers (user configuration, running in WSL).
- Official **Supabase** plugin (skills + MCP).

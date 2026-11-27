# Deploy — Dokploy

How to run cromodex on the VPS with Dokploy. The app is one Docker image
built from this repo's `Dockerfile`; the database and auth live in Supabase.

- Domain: `cromodex.duckdns.org` (DuckDNS, A record to the VPS).
- Container port: `3000`.
- Health check: built into the image (`GET /login` every 30 s).

## 1. Before every deploy that changes the schema

Migrations do **not** run when the container starts. When `drizzle/` has new
files, apply them from WSL first (uses `DIRECT_URL`, the session pooler):

```bash
npm run db:migrate
```

Then deploy. Today the cloud database has all migrations in `drizzle/`.

## 2. Create the application

1. Dokploy → **Projects** → *Create project* `cromodex`.
2. Inside it → *Create service* → **Application** `cromodex`.
3. **Provider**: GitHub (install the Dokploy GitHub App with access to
   `yerayboix/cromodex`), branch `main`.
4. **Build type**: Dockerfile. Dockerfile path `Dockerfile`, build context `.`.

## 3. Variables

Values are in your `.env.local`; never commit them.

**Build-time arguments** (inlined into the browser bundle, public):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

**Environment variables** (runtime):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | same as above |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same as above |
| `DATABASE_URL` | Supabase **session pooler**, port **5432** (secret) |

Not needed in production: `SUPABASE_SECRET_KEY` (only the local seed script
uses it) and `DIRECT_URL` (migrations run from WSL).

> Do not use the transaction pooler (port 6543): pages run several queries at
> once and it hangs on them.

## 4. Domain and HTTPS

Application → **Domains** → *Add domain*:

- Host `cromodex.duckdns.org`, path `/`, container port `3000`.
- HTTPS on, certificate provider **Let's Encrypt**.

Ports 80 and 443 of the VPS must be open for the certificate challenge.

## 5. Deploy

- *Deploy* and follow the build log. A build fails fast with
  `Missing NEXT_PUBLIC_* build args` if the build arguments are missing.
- Turn on **Auto deploy** so every push to `main` redeploys.
- Rollback: **Deployments** → redeploy a previous one.

## 6. Supabase

Authentication → **URL Configuration**:

- **Site URL**: `https://cromodex.duckdns.org` (Supabase builds email links from it).
- **Redirect URLs**: `https://cromodex.duckdns.org/**`.

Invitations work with Supabase's **default email templates** (custom templates need
custom SMTP). The invite link goes through Supabase, which redirects to the Site URL with
the session in the URL fragment; the login page completes it server-side and opens
*Elige tu contraseña* (name and password).

Adding someone to the group: Authentication → Users → *Invite user* with their email.
Sign-ups stay disabled. The invitee should open the link on a browser where nobody is
signed in to cromodex. Links work once and expire after **Email OTP Expiration**
(Authentication → Sign In / Providers → Email, default 1 hour; up to `86400` = 24 hours).
A used or expired link shows a notice on the login page.

If custom SMTP is ever added, [`supabase/templates/invite.html`](../supabase/templates/invite.html)
is a themed template whose link goes to `/auth/confirm`, which the app also handles.

## 7. Check after deploying

1. `https://cromodex.duckdns.org` redirects to `/login` with a valid certificate.
2. Sign in, publish a card, open it, withdraw it.
3. Dokploy shows the container as healthy; the logs have no `DATABASE_URL`
   or pooler errors.

## 8. Notifications (Telegram)

How the module works: [notifications.md](notifications.md). Order matters:

1. **Migrate** (adds the notification tables): `npm run db:migrate` from WSL.
2. **Create the bot**: in Telegram, talk to @BotFather → `/newbot`, pick a name
   (`cromodex`) and a username ending in `bot`. It gives you the token. Optionally
   set its picture and description there too.
3. **Variables** in Dokploy (Environment, runtime only):

   | Name | Value |
   | --- | --- |
   | `APP_URL` | `https://cromodex.duckdns.org` |
   | `TELEGRAM_BOT_TOKEN` | token from BotFather (secret) |
   | `TELEGRAM_BOT_USERNAME` | the bot username, without `@` |
   | `TELEGRAM_WEBHOOK_SECRET` | a long random string (secret) |
   | `NOTIFICATIONS_CRON_SECRET` | another long random string (secret) |

   Redeploy. A random string: `openssl rand -hex 32`.
4. **Webhook**: put the same Telegram values and `APP_URL` in `.env.local` and run
   `npm run telegram:webhook` from WSL. It tells Telegram to send the bot's
   messages to `/api/telegram/webhook`.
5. **Schedule** in Dokploy (Application → Schedules), every 5 minutes
   (`*/5 * * * *`), command run inside the app container:

   ```sh
   wget -qO- --post-data= --header="Authorization: Bearer $NOTIFICATIONS_CRON_SECRET" http://127.0.0.1:3000/api/notifications/dispatch
   ```

   Actions already notify right away; this retries failures and sends the
   batched "cartas que buscas" notices.
6. **Check**: *Tu cuenta* now shows *Avisos → Conectar Telegram*. Connect, have
   someone make you an offer, and the message arrives.

Without the Telegram variables the section stays hidden and nothing is sent.

## Test the production image locally

```bash
npm run docker:up     # builds with .env.local and serves on :3000
npm run docker:down
```

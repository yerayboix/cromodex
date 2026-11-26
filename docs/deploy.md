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

- **Authentication → URL Configuration → Site URL**: `https://cromodex.duckdns.org`.
  Login is email + password through Server Actions, so no redirect URLs are
  needed.
- Sign-ups stay disabled; create the group's users in **Authentication →
  Users** (optionally with `display_name` in the user metadata; otherwise the
  name is the part of the email before `@`, and each user can change it in
  *Tu cuenta*).

## 7. Check after deploying

1. `https://cromodex.duckdns.org` redirects to `/login` with a valid certificate.
2. Sign in, publish a card, open it, withdraw it.
3. Dokploy shows the container as healthy; the logs have no `DATABASE_URL`
   or pooler errors.

## Test the production image locally

```bash
npm run docker:up     # builds with .env.local and serves on :3000
npm run docker:down
```

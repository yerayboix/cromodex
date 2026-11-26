# cromodex

Anonymous card-trading board for a closed group of 6 friends (Panini *One Piece — Rumbo a Egghead* stickers). Users list duplicate cards, others make offers using card codes only, both sides counter-offer until accept/reject; names are revealed only in the public log of accepted trades.

- Product requirements: [docs/requirements.md](docs/requirements.md)
- Architecture and technical decisions: [docs/architecture.md](docs/architecture.md) — read it before writing code.

## Working agreements

- **Do not build or scaffold anything without an explicit "go" from the user.** Discuss first.
- Work step by step: one step (feature), one commit, **pushed right away** to `origin/main`, then check in with the user.
- Talk to the user in Spanish. **Everything in the repo is in English** (code, identifiers, comments, docs, commit messages) **except the app's user-facing copy, which is in Spanish.**
- **Anonymity is the core invariant:** never send another user's `user_id` to the client. All data access is server-side (Drizzle); Supabase is used in the browser **only for Auth**. Do not use Supabase shadcn blocks or `supabase.from()` from the client.
- Secrets live in `.env.local` (git-ignored). Never print, log or commit their values; validate them without showing them.
- The user creates Supabase Auth users by hand: tell them when a user is needed.
- Development happens in WSL (`~/projects/cromodex`); Node via nvm, Docker Engine inside WSL.
- UI library: **shadcn/ui** on Tailwind (style `base-nova`, base color `neutral`, lucide icons).
- Next.js 16 has breaking changes vs. older versions: see [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/` before writing Next code.

## Status

- Done: repo, conventions, requirements, architecture, Supabase project (Auth configured, connections verified), `.env.local` filled.
- Supabase users: the admin's own account exists. A trigger creates each user's `app.profiles` row automatically.
- Auth: `src/proxy.ts` (Next 16 replacement for middleware) refreshes the session and gates routes; login/logout are Server Actions (no Supabase client in the browser at all). `getCurrentUser()` in `src/lib/auth.ts` is the DAL entry point; reading it requires a `<Suspense>` boundary (Cache Components). Signed-in pages live in the `src/app/(app)` route group.
- DB: schema in `src/db/schema.ts`, client via `getDb()` in `src/db/index.ts` (server-only, lazy so `next build` never needs `DATABASE_URL`). Migrations in `drizzle/`, applied with `npm run db:migrate` (uses `DIRECT_URL`); after changing the schema run `npm run db:generate`. Custom SQL migrations via `npx drizzle-kit generate --custom --name <name>`.
- Card codes per collection live in `src/lib/collections.ts` (pure module, used for validation on client and server). One listing = one copy.
- Scaffold in 4 steps, one commit each (each step only after the user's go):
  1. ✅ Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + ESLint, `output: "standalone"`, `.env.example`.
  2. ✅ Drizzle: connection, `app` schema, first migration with all tables + seed of the Rumbo a Egghead collection (1–177, F1–F27).
  3. ✅ Supabase Auth login (email + password), proxy protecting routes, logout.
  4. ✅ Dockerfile + `docker-compose.yml`, image verified locally (`npm run docker:up` / `docker:down`).
- Design: theme C (One Piece) for phone and desktop, in the private design canvas artifact. Each collection picks a theme via `theme` in `src/lib/collections.ts` and a `[data-theme]` block in `globals.css`.
- UI built: board with filters, card panel (offers by alias, offer/counter composer, accept/reject/leave dialogs), publish, withdraw, Mis tratos, Buscadas, Registro, account (display name, logout). Routes live under `/c/[slug]` (see `src/lib/paths.ts`). Reads in `src/server/queries.ts` (viewer-relative DTOs), writes in `src/server/trading.ts` (one transaction each, outbox events).
- Out of scope still: card photos (the layout leaves room), notifications.
- Local end-to-end testing: a local Supabase stack (Docker) isolated from the cloud project. `npm run local:start`, then `npm run local:migrate` and `npm run local:seed` (test users ana/marcos/laura@cromodex.test, passwords in `scripts/seed-local.mjs`), then `npm run local:dev` (set `PORT` to run it beside the normal dev server). `npm run local:check` runs the business-rule checks of `scripts/check-trading.ts` (turns, ownership, concurrent accepts, withdrawals) against the local database. `scripts/local-env.sh` overrides the env so the cloud project is never touched. Claude drives the app with these users.
- Deploy: Dokploy on the VPS, domain cromodex.duckdns.org, step by step in [docs/deploy.md](docs/deploy.md). The image never touches the database at build time (anything that queries must run at request time).
- Next step: first deploy, then test with the group.

## Commit messages

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), written in **English**.

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Use for                                              |
|------------|------------------------------------------------------|
| `feat`     | A new feature                                        |
| `fix`      | A bug fix                                            |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                              |
| `test`     | Adding or fixing tests                               |
| `docs`     | Documentation only                                   |
| `style`    | Formatting, no code change                           |
| `build`    | Build system or dependencies                         |
| `ci`       | CI configuration                                     |
| `chore`    | Other maintenance                                    |

### Scopes (optional)

`collection`, `trades`, `stickers`, `photos`, `auth`, `db`, `ui`, `infra`. Omit the scope if none fits.

### Rules

- Description in imperative mood, lowercase, no trailing period, max 72 characters for the whole header.
- Body only when it adds the *why*; the diff already shows the *what*. Wrap at 72 characters.
- Breaking changes: `!` after the type/scope (`feat(db)!: ...`) and a `BREAKING CHANGE:` footer.
- Reference issues in the footer: `Closes #12`.
- Never add `Co-Authored-By` or any other attribution trailer.

### Examples

```
feat(collection): mark stickers as owned, missing or duplicate
fix(trades): validate quantities when accepting a trade
refactor(db): extract sticker_type into an enum
chore(deps): bump supabase-js to 2.x
docs: add local setup instructions
```

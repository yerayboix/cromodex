# cromodex

Anonymous card-trading board for a closed group of 6 friends (Panini *One Piece — Rumbo a Egghead* stickers). Users list duplicate cards, others make offers using card codes only, both sides counter-offer until accept/reject; names are revealed only in the public log of accepted trades.

- Product requirements: [docs/requirements.md](docs/requirements.md)
- Architecture and technical decisions: [docs/architecture.md](docs/architecture.md) — read it before writing code.

## Working agreements

- **Do not build or scaffold anything without an explicit "go" from the user.** Discuss first.
- Work step by step: one step, one commit, then check in with the user.
- Talk to the user in Spanish. Code, identifiers and commit messages in English; docs in Spanish.
- **Anonymity is the core invariant:** never send another user's `user_id` to the client. All data access is server-side (Drizzle); Supabase is used in the browser **only for Auth**. Do not use Supabase shadcn blocks or `supabase.from()` from the client.
- Secrets live in `.env.local` (git-ignored). Never print, log or commit their values; validate them without showing them.
- The user creates Supabase Auth users by hand: tell them when a user is needed.
- Development happens in WSL (`~/projects/cromodex`); Node via nvm, Docker Engine inside WSL.
- UI library: **shadcn/ui** on Tailwind.

## Status

- Done: repo, conventions, requirements, architecture, Supabase project (Auth configured, connections verified), `.env.local` filled.
- No app code yet. No Supabase users created yet.
- Next step (only after the user's go): scaffold in 4 steps, one commit each:
  1. Next.js + TypeScript + Tailwind + shadcn/ui + ESLint, `output: "standalone"`, `.env.example`.
  2. Drizzle: connection, `app` schema, first migration with all tables + seed of the Rumbo a Egghead collection (1–177, F1–F27).
  3. Supabase Auth login (email + password), middleware protecting routes, logout — ask the user to create their account here.
  4. Dockerfile + `docker-compose.yml`, verify the image runs locally.

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

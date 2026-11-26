# cromodex

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

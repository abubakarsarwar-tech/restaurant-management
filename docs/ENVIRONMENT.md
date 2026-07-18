# Environment

All configuration is **env-driven** — nothing secret or deploy-specific is
hardcoded. `.env.example` is committed (placeholders only); real `.env` files
are gitignored. `config/env.ts` validates everything with Zod at boot and
**fails fast** with a readable error if anything is missing/invalid.

## Variables

| Name                                           | Scope  | Required                     | Why                                                                                                                                                                        |
| ---------------------------------------------- | ------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | server | ✅                           | PostgreSQL connection string, `postgresql://user:pass@host:5433/db`. Consumed by drizzle-kit (`drizzle.config.ts` → migrate/studio) and the runtime pool (`db/client.ts`). |
| `JWT_SECRET`                                   | server | ✅                           | HMAC key for session tokens — **min 32 chars**. Generate: `openssl rand -base64 64`.                                                                                       |
| `JWT_EXPIRES_IN`                               | server | ➖ (`7d`)                    | Token lifetime (`jsonwebtoken` duration syntax).                                                                                                                           |
| `BCRYPT_SALT_ROUNDS`                           | server | ➖ (`12`)                    | Password hash cost; bounded 10–15 by validation.                                                                                                                           |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server | later                        | Signed uploads/deletes of dish photos (Menu part).                                                                                                                         |
| `NEXT_PUBLIC_APP_URL`                          | public | ➖ (`http://localhost:3000`) | Absolute URLs in metadata/OG/canonicals.                                                                                                                                   |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`              | public | later                        | Address autocomplete & store locator (Checkout part).                                                                                                                      |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`            | public | later                        | Unsigned image delivery in the browser via `next-cloudinary`.                                                                                                              |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`                  | public | later                        | Click-to-chat order support, digits-only intl format.                                                                                                                      |
| `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE`  | public | ➖ (`USD` / `en-US`)         | Drives `formatPrice` (`utils/format.ts`).                                                                                                                                  |

Rules:

- **Server values** import from `config/env.ts` (marked `server-only`).
- **Client code** imports from `config/env.public.ts` — it can only ever see
  `NEXT_PUBLIC_*` values; adding a secret there is a compile-time-offense by
  code review, and a design impossibility by split.
- `NEXT_PUBLIC_*` values are **inlined at build time** — changing them requires a rebuild.

## Local PostgreSQL & database commands

```bash
pnpm db:up         # docker compose up -d postgres  (postgres:17-alpine, port 5433)
pnpm db:down       # stop & remove
pnpm db:migrate    # apply migrations (drizzle-kit)
pnpm db:seed       # demo dataset
```

`DATABASE_URL` default matches the compose service
(`postgresql://postgres:postgres@localhost:5433/restaurant_db`). Port **5433**
on the host avoids colliding with any locally installed Postgres.

> **Note (Part 2):** the data layer moved from MySQL/Prisma to
> **PostgreSQL + Drizzle**. Drizzle needs no codegen step and no binary
> engines — `pnpm db:generate` (schema diff → SQL) works fully offline, and
> the runtime dependency is just the `postgres` JS driver.

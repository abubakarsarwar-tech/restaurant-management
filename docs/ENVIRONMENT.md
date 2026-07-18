# Environment

All configuration is **env-driven** — nothing secret or deploy-specific is
hardcoded. `.env.example` is committed (placeholders only); real `.env` files
are gitignored. `config/env.ts` validates everything with Zod at boot and
**fails fast** with a readable error if anything is missing/invalid.

## Variables

| Name                                           | Scope  | Required                     | Why                                                                                                                                                      |
| ---------------------------------------------- | ------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | server | ✅                           | MySQL connection string, `mysql://user:pass@host:3306/db`. Consumed by Prisma CLI (`prisma.config.ts`) and the runtime driver adapter (`lib/prisma.ts`). |
| `JWT_SECRET`                                   | server | ✅                           | HMAC key for session tokens — **min 32 chars**. Generate: `openssl rand -base64 64`.                                                                     |
| `JWT_EXPIRES_IN`                               | server | ➖ (`7d`)                    | Token lifetime (`jsonwebtoken` duration syntax).                                                                                                         |
| `BCRYPT_SALT_ROUNDS`                           | server | ➖ (`12`)                    | Password hash cost; bounded 10–15 by validation.                                                                                                         |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server | later                        | Signed uploads/deletes of dish photos (Menu part).                                                                                                       |
| `NEXT_PUBLIC_APP_URL`                          | public | ➖ (`http://localhost:3000`) | Absolute URLs in metadata/OG/canonicals.                                                                                                                 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`              | public | later                        | Address autocomplete & store locator (Checkout part).                                                                                                    |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`            | public | later                        | Unsigned image delivery in the browser via `next-cloudinary`.                                                                                            |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`                  | public | later                        | Click-to-chat order support, digits-only intl format.                                                                                                    |
| `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE`  | public | ➖ (`USD` / `en-US`)         | Drives `formatPrice` (`utils/format.ts`).                                                                                                                |

Rules:

- **Server values** import from `config/env.ts` (marked `server-only`).
- **Client code** imports from `config/env.public.ts` — it can only ever see
  `NEXT_PUBLIC_*` values; adding a secret there is a compile-time-offense by
  code review, and a design impossibility by split.
- `NEXT_PUBLIC_*` values are **inlined at build time** — changing them requires a rebuild.

## Local MySQL

```bash
pnpm db:up       # docker compose up -d mysql  (mysql:8.4, utf8mb4)
pnpm db:down     # stop & remove
```

`DATABASE_URL` default matches the compose service
(`mysql://root:rootpassword@localhost:3306/restaurant_db`).

## Prisma in offline/sandboxed networks

`pnpm db:generate` normally fetches the schema engine binary from
`binaries.prisma.sh`. If that host is unreachable (restricted CI, offline
workstations), generation works binary-free by pointing at any existing file:

```bash
PRISMA_SCHEMA_ENGINE_BINARY=/bin/true pnpm db:generate
```

(The generated client itself is pure TypeScript + the `mariadb` driver
adapter, so no native engines are needed at runtime. `migrate`/`studio`
commands DO need the real engine on a networked machine.)

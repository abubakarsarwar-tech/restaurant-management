# db/ — Database Layer

PostgreSQL 17 + Drizzle ORM. Full architecture: [`docs/DATABASE.md`](../docs/DATABASE.md).

```
db/
├── client.ts          # Drizzle singleton (postgres.js pool, server-only,
│                      # globalThis-cached against hot reloads)
├── index.ts           # public barrel: { db, schema, DbClient }
├── schema/            # the schema — one file per domain, all inferred TS
│   ├── index.ts       #   barrel consumed by drizzle-kit
│   ├── utils.ts       #   column builders (uuid pk, timestamps, cents, bp)
│   ├── enums.ts       #   15 native PG enums (append-only!)
│   ├── core.ts        #   media, restaurants, branches, settings, taxes, hours
│   ├── auth.ts        #   RBAC: permissions, roles, users, assignments
│   ├── customers.ts   #   customers (guest-capable), saved addresses
│   ├── catalog.ts     #   categories→products→variants→add-ons, inventory,
│   │                  #   tags, ingredients, branch overrides
│   ├── delivery.ts    #   zones, tiered charges
│   ├── sales.ts       #   orders, items, status events, loyalty ledger
│   ├── coupons.ts     #   coupons, targets, redemptions
│   ├── payments.ts    #   payments, gateway transactions (idempotency keys)
│   ├── engagement.ts  #   reviews, favorites, notifications
│   ├── content.ts     #   banner slides
│   └── audit.ts       #   audit logs (append-only, polymorphic entity)
├── migrations/        # generated SQL + journal — COMMITTED, PR-reviewed
└── seed/
    └── index.ts       # idempotent demo seed (standalone client by design)
```

## Commands

```bash
pnpm db:up          # start Postgres 17 (Docker) on localhost:5433
pnpm db:generate    # diff schema → new migration SQL
pnpm db:migrate     # apply pending migrations
pnpm db:check       # validate migrations
pnpm db:studio      # Drizzle Studio (visual browser)
pnpm db:seed        # idempotent demo dataset
pnpm db:seed -- --reset
```

## Conventions

- Query with `db.query.<table>.findMany({ with: { … } })` (relational API) or
  the SQL-close `db.select()`. Both infer from the same schema.
- Infer types from tables: `type Product = typeof products.$inferSelect`.
- Never write floats for money — integer cents; never add an index without a
  named consumer; never let app code bypass the snapshot rules on orders.
- Schema change flow: edit `schema/*` → `pnpm db:generate` → review SQL →
  commit both → `pnpm db:migrate` everywhere else.

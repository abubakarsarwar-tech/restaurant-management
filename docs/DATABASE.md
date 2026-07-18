# Database Architecture

**PostgreSQL 17 · Drizzle ORM · 44 tables · 15 native enums · 89 indexes · 83 foreign keys · 23 CHECK constraints**

Designed as a shared-schema **multi-tenant SaaS**: one database hosts many
restaurants; every business table carries `restaurant_id` as its tenant key,
and `branches` adds the multi-location dimension underneath a restaurant.

---

## 1 · Why this structure

| Decision                                                | Rationale                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL** over MySQL                               | Native enums, CHECK constraints, partial indexes, jsonb (settings/theme/snapshots), arrays (available_days), `num_nonnulls`, CTE/window analytics, and a friction-free PostGIS path for delivery zones — order of magnitude better data-integrity toolbox. |
| **Drizzle ORM** over Prisma                             | The schema IS TypeScript: full inference with zero codegen step, SQL-close mental model (you write what Postgres runs), first-class migration files reviewed as real SQL, tiny runtime. `db.query.*` gives Rails-style relational reads when convenient.   |
| **Shared-schema tenancy** (`restaurant_id` everywhere)  | One schema to migrate forever; cross-tenant analytics for the platform; trivially enforced with composite indexes + (later) Postgres RLS. Schema-per-tenant drowns you operationally past ~50 tenants.                                                     |
| **UUID PKs** (`gen_random_uuid()`)                      | Non-enumerable in URLs, merge/import-safe, generated without a round-trip, no hot-spotting on a single sequence at high insert rates. Human-facing numbers (orders) get their own `bigserial` display column.                                              |
| **Integer cents + basis points**                        | `price_cents`, `rate_bp`. Floats don't belong anywhere near money or tax math. Currency is snapshotted onto every order/payment.                                                                                                                           |
| **Snapshot-on-order**                                   | Names, prices, addresses, coupon codes, tax breakdowns are COPIED onto orders at checkout. History is immutable; catalog edits can never rewrite a receipt. FKs to operational records are `RESTRICT`.                                                     |
| **Ledger + cache pairs** (inventory, loyalty, payments) | `inventory_levels`/`loyalty_points` are fast-read caches; `inventory_movements`, `loyalty_point_transactions`, `payment_transactions`, `order_status_events` are the append-only truth that explains them. Any "balance" can be rebuilt.                   |
| **Soft delete on catalog entities** (`deleted_at`)      | Products/categories disappear from menus while order history, reports and favorites stay joinable.                                                                                                                                                         |

## 2 · Relationship map

### One-to-One

| Relation                              | Enforcement                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `restaurants` ↔ `restaurant_settings` | settings PK **is** the restaurant FK — physically impossible to have two settings rows    |
| `orders` ↔ `coupon_redemptions`       | unique index on `order_id` (also enforces one-coupon-per-order)                           |
| `orders` ↔ `reviews`                  | unique index on `order_id` — one review per completed order                               |
| `product_images` primary hero         | partial unique index `(product_id) WHERE is_primary` — exactly one hero image per product |

### One-to-Many (the backbone)

`restaurants`→`branches`→`business_hours`/`holiday_hours`/`delivery_zones`/`inventory_levels` ·
`restaurants`→`tax_rates`/`coupons`/`notifications`/`audit_logs` ·
`categories`→`categories` (self-FK `parent_id`, SET NULL → orphans promote to top-level) ·
`categories`→`products`→`product_images`/`product_variants`/`addon_groups`→`addons` ·
`product_variants`→`variant_options` ·
`customers`→`customer_addresses`/`notifications` ·
`orders`→`order_items`/`order_status_events`/`payments`→`payment_transactions` ·
`delivery_zones`→`delivery_charges` (tiered pricing) ·
`roles`→`user_roles`→`users`

### Many-to-Many (junction tables, composite PKs)

| Junction              | Connects                                | Notes                                                   |
| --------------------- | --------------------------------------- | ------------------------------------------------------- |
| `role_permissions`    | roles ↔ permissions                     | RBAC core                                               |
| `user_roles`          | users ↔ roles (+ optional branch scope) | one user, many roles, any branch granularity            |
| `product_tags`        | products ↔ tags                         | merchandising facets                                    |
| `product_ingredients` | products ↔ ingredients                  | recipe/BOM + allergen data (`quantity`, `is_removable`) |
| `favorites`           | customers ↔ products                    | wishlist, `(customer, product)` PK                      |
| `branch_products`     | branches ↔ products                     | per-branch availability + price override                |
| `coupon_targets`      | coupons ↔ products/categories           | CHECK: exactly one side set; empty ⇒ applies to all     |

## 3 · ER diagram (text)

```
                                 ┌──────────────┐
          ┌──────────────────────│ media_assets │◄──────────────┐
          │ (logo,hero,banner…)  └──────▲───────┘               │
          │                             │                       │
┌─────────┴──────┐ 1:1 ┌────────────────┴───────┐      ┌────────┴────────┐
│  restaurants   │────│ restaurant_settings    │      │ banner_slides   │
│  (tenant,slug) │    │ theme/social/ordering  │      └─────────────────┘
└───────┬────────┘    └────────────────────────┘
   1:N  │  ┌───────────────┬─────────────────┬───────────────┐
        │  │               │                 │               │
┌───────┴──┴──┐   ┌────────┴───────┐ ┌───────┴───────┐ ┌─────┴──────┐
│  branches   │   │   tax_rates    │ │ notifications │ │ audit_logs │
│ code,is_main│   └────────────────┘ └───────────────┘ └────────────┘
└──┬───┬───┬──┘
   │   │   ├── business_hours (7d × slots) ── holiday_hours (date overrides)
   │   │   ├── delivery_zones ──1:N── delivery_charges (tiered fees)
   │   │   ├── inventory_levels(levels) ─── inventory_movements(ledger)
   │   │   └── branch_products (_per-branch availability/price_)*
   │   │
   │   │      ┌──────────── CATALOG (restaurant-scoped) ───────────┐
   │   │      │                                                    │
   │   └─────►│ categories ─┐self-FK parent                        │
   │          │     │ 1:N   ▼                                      │
   │          │  products ─── product_images ──► media_assets       │
   │          │     │ ├─ product_variants ── variant_options        │
   │          │     │ ├─ addon_groups ── addons                     │
   │          │     │ ├─ product_tags ── tags                       │
   │          │     │ └─ product_ingredients ── ingredients         │
   │          └─────┼────────────────────────────────────────────────┘
   │                │
   │          ┌─────▼──────┐        ┌─────────────┐
   │          │ customers  │──1:N──►│ customer_   │
   │          │ (guest ok, │        │ addresses   │
   │          │  phone-uid)│        └─────────────┘
   │          └─────┬──────┘
   │               │ 1:N              ┌──────── SALES / MONEY ────────────────┐
   │          ┌────▼──────────────────▼─────────────────┐                    │
   └─────────►│ orders (type,status,totals,snapshots)   │                    │
              │  ├─1:N order_items (product snapshot)   │                    │
              │  ├─1:N order_status_events (live feed)  │                    │
              │  ├─1:N payments ──1:N payment_transactions (idempotent)      │
              │  ├─1:1 reviews (moderated)              │                    │
              │  ├─1:1 coupon_redemptions ──► coupons ── coupon_targets      │
              │  └─ loyalty_point_transactions (ledger) │                    │
              └─────────────────────────────────────────┴────────────────────┘

        ┌────────── RBAC (staff, separate from customers) ──────────┐
        │ users ── user_roles(±branch) ── roles ── role_permissions │
        │          ── permissions                                     │
        └───────────────────────────────────────────────────────────┘
```

## 4 · Performance & index strategy

Indexes follow **query patterns**, not table diagrams (documented inline by
each `index(...)` — they're named `table_purpose_idx` so `EXPLAIN` output reads
like English):

| Hot path (dinner rush)                                  | Index                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Storefront menu: active+available products per tenant   | `products_storefront_idx (restaurant_id, is_active, is_available, category_id)`  |
| KDS live board: active orders at a branch, newest first | `orders_branch_status_created_idx (branch_id, status, created_at)`               |
| Customer history paginated by cursor                    | `orders_customer_created_idx (customer_id, created_at)`                          |
| Checkout: coupon validity window                        | `coupons_active_window_idx (restaurant_id, is_active, starts_at, ends_at)`       |
| Scheduled-order dispatcher                              | `orders_scheduled_idx (scheduled_for) WHERE scheduled_for IS NOT NULL` (partial) |
| PDP review feed                                         | `reviews_product_idx (product_id, status, created_at)`                           |
| Unread notification badges (both recipient kinds)       | `notifications_user_idx / notifications_customer_idx (…, is_read, created_at)`   |
| Per-customer coupon limit check                         | `coupon_redemptions_coupon_customer_idx`                                         |

Rules held everywhere: **every FK is indexed** (joins + cascades stay linear),
**every uniqueness that matters to the business is a unique index**
(`restaurants.slug`, `(restaurant, sku/code/email…)`, idempotency keys),
**partial unique indexes** encode one-true-row rules (hero image, default
variant), and writes stay cheap because no index lacks a named consumer.

Volume plan for _millions of orders_: `orders`/`order_items` are append-mostly
→ they vacuum well; hot rows are always "today at my branch" (the partial +
composite indexes cover it); deep history reads use cursor pagination on
`(customer_id, created_at)`; monthly `PARTITION BY RANGE (created_at)` on the
four event/ledger tables is a documented future step that requires zero app
change (Postgres partitioning is transparent to queries).

## 5 · Migration strategy

|               |                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool          | `drizzle-kit generate` diffs schema → SQL in `db/migrations/` (`0000_…_nx`), plus journaling metadata                                        |
| Rule 1        | Migrations are **committed code** — PR-reviewed like any change                                                                              |
| Rule 2        | Every PR that changes `db/schema/**` ships its migration in the same PR (`pnpm db:generate`)                                                 |
| Apply         | `pnpm db:migrate` (CLI `migrate`). CI runs `pnpm db:check` (consistency) + `db:migrate` against a scratch Postgres on PRs                    |
| Expansions    | Additive-first: new nullable col → backfill in chunks → tighten NOT NULL in a later migration. Enum values are append-only                   |
| Rollback      | Forward-only policy: a fix is a new migration (revert migrations only exist pre-merge)                                                       |
| Environments  | dev (`db:push` allowed for scratch prototyping ONLY) → staging (`migrate`) → production (`migrate` in deploy step, app starts after success) |
| Zero-downtime | Backfill-on-write pattern + dual-read windows for renames; long backfills shipped as separate scripts under `db/scripts/`                    |

## 6 · Seed strategy

```
pnpm db:up              # Postgres 17 (Docker)
pnpm db:migrate         # apply 0000_*.sql
pnpm db:seed            # idempotent demo dataset
pnpm db:seed -- --reset # nuclear: truncate all, reseed
```

| Phase      | Content                                                                                                                                                  | Why                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| System     | 15 permissions + Owner/Manager/Kitchen mapping                                                                                                           | RBAC works on first login               |
| Tenant     | "Saffron Table" + 2 branches, settings, GST 6%, 7-day hours, 1 holiday                                                                                   | Exercises multi-branch & hours logic    |
| Staff      | 3 users (bcrypt, demo password printed)                                                                                                                  | Login-ready before Part 3 exists        |
| Catalog    | 6 products × variants/add-ons/images/tags, allergen recipe links, stock + movements, 1 branch override                                                   | Every product feature flag demonstrable |
| Fulfilment | 2 zones + tiered charges incl. free-delivery tier                                                                                                        | Checkout fee logic testable             |
| Promotions | WELCOME10 (% + cap + first-order) / FREESHIP                                                                                                             | Both discount mechanics                 |
| Sales      | 3 orders at different lifecycle stages (computed totals satisfy all CHECKs), online PAID + cash PENDING + online PENDING payments, status-event timeline | Order pipeline & payment states visible |
| Engagement | redemption, loyalty earn, approved review + reply, favorites, 2 notifications, 2 audit rows, 2 banners                                                   | Everything renders day one              |

Seed properties: **idempotent** (natural-key `getOrCreate`), **deterministic**
(no faker — real-looking demo data), **CHECK-safe** (money math computed, not
hand-written), and honest placeholders (`res.cloudinary.com/demo` images).

## 7 · Future scalability (designed-in, not bolted-on)

1. **PostGIS** — zone containment: `boundary` is jsonb today; a generated
   `geography(POLYGON)` column + GIST index later is additive only.
2. **Row-Level Security** — `restaurant_id` on every table → `CREATE POLICY
tenant_isolation USING (restaurant_id = current_setting('app.tenant')::uuid)`
   gives DB-enforced SaaS isolation without app refactor.
3. **Read replicas** — reads already named per query class; analytical reads
   (reports) can be routed replica-side via drizzle client selection.
4. **Sharding horizon** — tenant-keyed layout + UUID keys make
   restaurant-hash sharding possible if a single writer ever saturates.
5. **Event sourcing hooks** — `order_status_events`/`audit_logs` already form
   an event spine; streaming them (logical decoding / Debezium) powers
   real-time rider maps and warehouse pipelines without new app tables.
6. **Multi-currency** — currency snapshotted per order; adding a `currencies`
   table + `restaurant_currencies` pivot is additive.

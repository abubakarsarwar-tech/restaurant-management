import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Shared column builders — the design-system of the database layer.
 *
 * Conventions enforced here (see docs/DATABASE.md for rationale):
 *  - UUIDv4 primary keys everywhere (`gen_random_uuid()`, app-side friendly,
 *    merge/replication-safe, non-enumerable in URLs).
 *  - `created_at` / `updated_at` (timezone-aware, UTC) on EVERY table.
 *    Append-only ledgers/events get just `createdAt`.
 *  - Money is INTEGER CENTS — never floats (`3999` = $39.99).
 *  - Rates are INTEGER BASIS POINTS (`500` = 5.00%).
 */

export const id = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Append-only tables (events, logs, ledgers): immutable rows. */
export const createdOnly = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
};

/** Soft-delete marker for catalog entities that order history depends on. */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
};

/** Money column in the tenant's currency, integer cents. */
export const moneyCents = (column: string) => integer(column).notNull();

/** Nullable money column (optional overrides, snapshots). */
export const moneyCentsNullable = (column: string) => integer(column);

/** Rate column in basis points (5.00% = 500). */
export const rateBp = (column: string) => integer(column).notNull();

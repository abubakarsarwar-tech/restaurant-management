import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { id, softDelete, timestamps } from "./utils";
import { restaurants } from "./core";

/**
 * ── CUSTOMER DOMAIN ─────────────────────────────────────────────────────────
 * Storefront shoppers — kept separate from `users` (staff) on purpose:
 * different auth surface, guest checkout never needs a password row, and
 * per-tenant identity lets the same person be "a customer" of Darbar BBQ AND
 * Pizza Port independently (separate loyalty, favorites, addresses).
 *
 * Guest checkout: a minimal row is upserted by phone at first order;
 * `password_hash IS NULL` ⇒ guest. Registering later "claims" the same row
 * (history/loyalty preserved). Loyalty movements live in sales.ts beside
 * orders (earnings/redemption are order-contextual events).
 */

export const customers = pgTable(
  "customers",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: varchar("email", { length: 320 }),
    passwordHash: text("password_hash"), // NULL = guest account
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"), // staff-facing: "gate code 42", "allergic to nuts"
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
    ...softDelete, // GDPR/anonymize without breaking order history
  },
  (t) => [
    // One identity per phone number per tenant.
    uniqueIndex("customers_restaurant_phone_uq").on(t.restaurantId, t.phone),
    index("customers_restaurant_email_idx").on(t.restaurantId, t.email),
    index("customers_restaurant_active_idx").on(t.restaurantId, t.isActive),
  ],
);

// ── Saved Addresses ─────────────────────────────────────────────────────────
// Orders snapshot the chosen address into order rows at checkout, so later
// edits here never corrupt history.
export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 40 }).notNull().default("Home"), // Home/Work/Other
    recipientName: varchar("recipient_name", { length: 160 }),
    phone: varchar("phone", { length: 32 }),
    line1: varchar("line1", { length: 255 }).notNull(),
    line2: varchar("line2", { length: 255 }),
    area: varchar("area", { length: 120 }), // neighborhood — matches delivery zones
    city: varchar("city", { length: 120 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    instructions: text("instructions"), // "leave at the gate"
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("customer_addresses_customer_idx").on(t.customerId),
    // Resolved default is enforced app-side (one default per customer);
    // uniqueness with NULL semantics in PG can't express it portably.
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────
export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(customerAddresses),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAddresses.customerId],
    references: [customers.id],
  }),
}));

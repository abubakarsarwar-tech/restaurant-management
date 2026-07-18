import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createdOnly, id, moneyCentsNullable, timestamps } from "./utils";
import { discountTypeEnum } from "./enums";
import { branches, restaurants } from "./core";
import { categories, products } from "./catalog";
import { customers } from "./customers";
import { orders } from "./sales";

/**
 * ── PROMOTIONS DOMAIN ───────────────────────────────────────────────────────
 * Coupon types: PERCENTAGE (value_bp) | FIXED_AMOUNT (value_cents) |
 * FREE_DELIVERY — the CHECK enforces the right value column per type.
 *
 * Scope:  no rows in coupon_targets ⇒ applies to entire menu;
 *         rows restrict to specific products/categories.
 * Usage:  coupon_redemptions enforces per-customer limits and feeds
 *         "campaign performance" reporting without touching orders.
 */

export const coupons = pgTable(
  "coupons",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    // NULL = usable at every branch of the restaurant
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "cascade",
    }),
    // Stored UPPERCASE by the application; unique per tenant.
    code: varchar("code", { length: 40 }).notNull(),
    description: varchar("description", { length: 255 }),
    type: discountTypeEnum("type").notNull(),
    valueBp: integer("value_bp"), // PERCENTAGE: 15% = 1500
    valueCents: integer("value_cents"), // FIXED_AMOUNT
    minOrderCents: integer("min_order_cents").notNull().default(0),
    maxDiscountCents: moneyCentsNullable("max_discount_cents"), // cap on % discounts
    usageLimitTotal: integer("usage_limit_total"),
    usageLimitPerCustomer: integer("usage_limit_per_customer"),
    timesUsed: integer("times_used").notNull().default(0), // cached counter
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("coupons_restaurant_code_uq").on(t.restaurantId, t.code),
    // Checkout validation: active + time window
    index("coupons_active_window_idx").on(
      t.restaurantId,
      t.isActive,
      t.startsAt,
      t.endsAt,
    ),
    check(
      "coupons_value_chk",
      sql`(${t.type} = 'PERCENTAGE' and ${t.valueBp} between 1 and 10000)
          or (${t.type} = 'FIXED_AMOUNT' and ${t.valueCents} > 0)
          or (${t.type} = 'FREE_DELIVERY' and ${t.valueBp} is null and ${t.valueCents} is null)`,
    ),
    check(
      "coupons_window_chk",
      sql`${t.startsAt} is null or ${t.endsAt} is null or ${t.endsAt} > ${t.startsAt}`,
    ),
  ],
);

// ── Coupon Targets (scope restriction) ─────────────────────────────────────
export const couponTargets = pgTable(
  "coupon_targets",
  {
    id: id(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    ...createdOnly,
  },
  (t) => [
    index("coupon_targets_coupon_idx").on(t.couponId),
    check(
      "coupon_targets_one_chk",
      sql`num_nonnulls(${t.productId}, ${t.categoryId}) = 1`,
    ),
  ],
);

// ── Coupon Redemptions (usage ledger) ───────────────────────────────────────
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: id(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id, { onDelete: "restrict" }),
    discountCents: integer("discount_cents").notNull(),
    ...createdOnly,
  },
  (t) => [
    // Our model: at most ONE coupon per order (matches orders.coupon_id).
    uniqueIndex("coupon_redemptions_order_uq").on(t.orderId),
    // Per-customer limit enforcement: count rows per (coupon, customer)
    index("coupon_redemptions_coupon_customer_idx").on(t.couponId, t.customerId),
  ],
);

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [coupons.restaurantId],
    references: [restaurants.id],
  }),
  branch: one(branches, { fields: [coupons.branchId], references: [branches.id] }),
  targets: many(couponTargets),
  redemptions: many(couponRedemptions),
}));

export const couponTargetsRelations = relations(couponTargets, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponTargets.couponId],
    references: [coupons.id],
  }),
  product: one(products, {
    fields: [couponTargets.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [couponTargets.categoryId],
    references: [categories.id],
  }),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  customer: one(customers, {
    fields: [couponRedemptions.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [couponRedemptions.orderId],
    references: [orders.id],
  }),
}));

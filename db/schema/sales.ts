import { relations } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createdOnly, id, moneyCents, timestamps } from "./utils";
import {
  orderSourceEnum,
  orderStatusEnum,
  orderTypeEnum,
  paymentStatusEnum,
} from "./enums";
import { branches, restaurants } from "./core";
import { customers } from "./customers";
import { users } from "./auth";
import { products, productVariants } from "./catalog";
import { deliveryZones } from "./delivery";
import { coupons } from "./coupons";

/**
 * ── SALES DOMAIN ────────────────────────────────────────────────────────────
 * Orders are IMMUTABLE FACTS. Two patterns protect them forever:
 *
 *  1. Snapshotting — product names, prices, address, coupon code and tax
 *     breakdown are copied onto the order at checkout. Editing (or deleting)
 *     catalog/address/coupon rows later can NEVER rewrite a customer's
 *     receipt or yesterday's revenue report.
 *  2. Restrictive deletes — FKs to restaurants/branches/customers use
 *     RESTRICT so operational records can't be physically destroyed by
 *     accident (soft-delete catalog entities instead).
 *
 * Money columns are all integer cents with a `currency` snapshot (tenant
 * currency can change tomorrow; today's order stays historically exact).
 */

export const orders = pgTable(
  "orders",
  {
    id: id(),
    // Human-friendly sequential number per tenant for receipts/support
    // ("#10234"). uuid stays the PK; the number is a display/lookup key.
    orderNumber: bigserial("order_number", { mode: "number" }).notNull(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),

    // Flow
    type: orderTypeEnum("type").notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
    source: orderSourceEnum("source").notNull().default("WEB"),

    // Dine-in & scheduling
    tableNumber: varchar("table_number", { length: 20 }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: "date" }),

    // Coupon (snapshot + reference). AnyPgColumn breaks the TS inference
    // recursion on the orders↔couponRedemptions FK cycle.
    couponId: uuid("coupon_id").references((): AnyPgColumn => coupons.id, {
      onDelete: "restrict",
    }),
    couponCode: varchar("coupon_code", { length: 40 }),

    // Money (integer cents) — full accounting decomposed
    subtotalCents: moneyCents("subtotal_cents").notNull(), // sum of line totals
    discountCents: integer("discount_cents").notNull().default(0),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    tipCents: integer("tip_cents").notNull().default(0),
    totalCents: moneyCents("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    // [{ "name": "GST", "rateBp": 1700, "amountCents": 255 }] — one entry per
    // applied tax_rate, preserving the exact math the customer saw.
    taxBreakdown: jsonb("tax_breakdown")
      .$type<{ name: string; rateBp: number; amountCents: number }[]>()
      .notNull()
      .default([]),

    // Delivery fulfilment (address SNAPSHOT — see header note)
    deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id, {
      onDelete: "set null",
    }),
    deliveryAddress: jsonb("delivery_address").$type<{
      recipientName?: string;
      phone?: string;
      line1: string;
      line2?: string;
      area?: string;
      city: string;
      postalCode?: string;
      instructions?: string;
    }>(),
    deliveryLatitude: numeric("delivery_latitude", { precision: 10, scale: 7 }),
    deliveryLongitude: numeric("delivery_longitude", { precision: 10, scale: 7 }),

    // Notes & people
    customerNote: text("customer_note"), // "ring the bell twice"
    kitchenNote: text("kitchen_note"), // staff-internal
    assignedRiderId: uuid("assigned_rider_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Lifecycle timestamps (unset until reached)
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
    estimatedReadyAt: timestamp("estimated_ready_at", {
      withTimezone: true,
      mode: "date",
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    cancelReason: text("cancel_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),

    isTestOrder: boolean("is_test_order").notNull().default(false), // seed/demo flag
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_restaurant_number_uq").on(t.restaurantId, t.orderNumber),

    // KDS / ops hot path: "what's active at this branch right now"
    index("orders_branch_status_created_idx").on(t.branchId, t.status, t.createdAt),
    // Customer order history
    index("orders_customer_created_idx").on(t.customerId, t.createdAt),
    // Tenant analytics scans
    index("orders_restaurant_created_idx").on(t.restaurantId, t.createdAt),
    index("orders_restaurant_type_idx").on(t.restaurantId, t.type),
    // Scheduled orders queue ("fire these at their scheduled time")
    index("orders_scheduled_idx")
      .on(t.scheduledFor)
      .where(sql`${t.scheduledFor} is not null`),
    // Unpaid online orders cleanup / payment dashboard
    index("orders_payment_status_idx").on(t.restaurantId, t.paymentStatus),

    check(
      "orders_total_chk",
      sql`${t.totalCents} = ${t.subtotalCents} - ${t.discountCents} + ${t.deliveryFeeCents} + ${t.taxCents} + ${t.tipCents}`,
    ),
    check(
      "orders_money_chk",
      sql`${t.subtotalCents} >= 0 and ${t.discountCents} >= 0 and ${t.deliveryFeeCents} >= 0 and ${t.taxCents} >= 0 and ${t.tipCents} >= 0`,
    ),
    check(
      "orders_dine_in_table_chk",
      sql`${t.type} <> 'DINE_IN' or ${t.tableNumber} is not null`,
    ),
    check(
      "orders_delivery_address_chk",
      sql`${t.type} <> 'DELIVERY' or ${t.deliveryAddress} is not null`,
    ),
  ],
);

// ── Order Items ─────────────────────────────────────────────────────────────
// FKs to catalog are NULLABLE + SET NULL so a deleted product keeps the
// receipt intact — the snapshot columns carry the truth.
export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),

    // Snapshots
    productName: varchar("product_name", { length: 180 }).notNull(),
    variantName: varchar("variant_name", { length: 120 }),
    sku: varchar("sku", { length: 64 }),

    quantity: integer("quantity").notNull(),
    unitPriceCents: moneyCents("unit_price_cents"),
    // [{ "name": "Extra cheese", "priceCents": 150, "quantity": 1 }]
    addons: jsonb("addons")
      .$type<{ name: string; priceCents: number; quantity: number }[]>()
      .notNull()
      .default([]),
    addonsTotalCents: integer("addons_total_cents").notNull().default(0),
    lineTotalCents: moneyCents("line_total_cents"),

    specialInstructions: varchar("special_instructions", { length: 255 }), // "no onions"
    ...createdOnly,
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    // "Which products sell" reporting
    index("order_items_product_idx").on(t.productId),
    check("order_items_qty_chk", sql`${t.quantity} > 0`),
    check(
      "order_items_total_chk",
      sql`${t.lineTotalCents} = (${t.unitPriceCents} + ${t.addonsTotalCents}) * ${t.quantity}`,
    ),
  ],
);

// ── Order Status Events (the "live status" feed — append-only) ─────────────
// The current status column is a cached projection; THIS is the truth and
// powers live tracking timelines, prep-time analytics and dispute history.
export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // NULL from-status = order creation event
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    note: varchar("note", { length: 255 }),
    // Who moved it: staff user, or NULL = system/customer automation
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...createdOnly,
  },
  (t) => [
    index("order_status_events_order_idx").on(t.orderId, t.createdAt),
    index("order_status_events_changed_by_idx").on(t.changedByUserId),
  ],
);

// ── Loyalty Point Transactions (append-only ledger) ────────────────────────
// customers.loyalty_points is the cached balance; this ledger explains it.
export const loyaltyTxnType = {
  EARN: "EARN", // +points from a delivered order
  REDEEM: "REDEEM", // −points spent at checkout
  ADJUST: "ADJUST", // staff/manual correction
  EXPIRE: "EXPIRE", // points lapsed
} as const;

export const loyaltyPointTransactions = pgTable(
  "loyalty_point_transactions",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    type: varchar("type", { length: 12 }).notNull(),
    points: integer("points").notNull(), // signed (+ earn / − redeem)
    balanceAfter: integer("balance_after").notNull(), // running balance snapshot
    note: varchar("note", { length: 255 }),
    ...createdOnly,
  },
  (t) => [
    index("loyalty_txn_customer_idx").on(t.customerId, t.createdAt),
    index("loyalty_txn_order_idx").on(t.orderId),
    check("loyalty_txn_type_chk", sql`${t.type} in ('EARN','REDEEM','ADJUST','EXPIRE')`),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ one, many }) => ({
  branch: one(branches, { fields: [orders.branchId], references: [branches.id] }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  deliveryZone: one(deliveryZones, {
    fields: [orders.deliveryZoneId],
    references: [deliveryZones.id],
  }),
  rider: one(users, { fields: [orders.assignedRiderId], references: [users.id] }),
  items: many(orderItems),
  statusEvents: many(orderStatusEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orderStatusEventsRelations = relations(orderStatusEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusEvents.orderId],
    references: [orders.id],
  }),
  changedBy: one(users, {
    fields: [orderStatusEvents.changedByUserId],
    references: [users.id],
  }),
}));

export const loyaltyPointTransactionsRelations = relations(
  loyaltyPointTransactions,
  ({ one }) => ({
    customer: one(customers, {
      fields: [loyaltyPointTransactions.customerId],
      references: [customers.id],
    }),
    order: one(orders, {
      fields: [loyaltyPointTransactions.orderId],
      references: [orders.id],
    }),
  }),
);

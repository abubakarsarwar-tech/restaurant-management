import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createdOnly, id, timestamps } from "./utils";
import { notificationChannelEnum, notificationTypeEnum, reviewStatusEnum } from "./enums";
import { branches, restaurants } from "./core";
import { customers } from "./customers";
import { products } from "./catalog";
import { orders } from "./sales";
import { users } from "./auth";

/**
 * ── ENGAGEMENT DOMAIN ───────────────────────────────────────────────────────
 * Reviews (moderated), favorites (wishlist), notifications (multi-channel).
 */

// ── Reviews ─────────────────────────────────────────────────────────────────
// One review per completed order (unique order_id), optionally rating a
// specific dish as well as the overall experience. PENDING by default —
// moderation before public display.
export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }), // NULL = overall/order review; set = dish review
    rating: smallint("rating").notNull(),
    title: varchar("title", { length: 120 }),
    body: text("body"),
    status: reviewStatusEnum("status").notNull().default("PENDING"),
    replyText: text("reply_text"), // owner's public response
    repliedAt: timestamp("replied_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("reviews_order_uq").on(t.orderId),
    // PDP review feed: approved reviews, newest first
    index("reviews_product_idx").on(t.productId, t.status, t.createdAt),
    index("reviews_branch_idx").on(t.branchId, t.status),
    index("reviews_customer_idx").on(t.customerId),
    check("reviews_rating_chk", sql`${t.rating} between 1 and 5`),
  ],
);

// ── Favorites (wishlist — customer × product) ───────────────────────────────
export const favorites = pgTable(
  "favorites",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ...createdOnly,
  },
  (t) => [
    primaryKey({ columns: [t.customerId, t.productId] }),
    index("favorites_product_idx").on(t.productId),
  ],
);

// ── Notifications ───────────────────────────────────────────────────────────
// Recipient is EXACTLY ONE of (staff user, customer) — enforced by CHECK so
// both sides stay fully referential (no polymorphic orphan rows).
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").notNull().default("IN_APP"),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    // { "orderId": "…", "url": "/orders/…" } — deep-link payloads
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    ...createdOnly,
  },
  (t) => [
    // Inbox views: unread-first per recipient
    index("notifications_user_idx").on(t.userId, t.isRead, t.createdAt),
    index("notifications_customer_idx").on(t.customerId, t.isRead, t.createdAt),
    index("notifications_restaurant_type_idx").on(t.restaurantId, t.type),
    check(
      "notifications_recipient_chk",
      sql`num_nonnulls(${t.userId}, ${t.customerId}) = 1`,
    ),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────
export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  branch: one(branches, { fields: [reviews.branchId], references: [branches.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  customer: one(customers, {
    fields: [favorites.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [favorites.productId],
    references: [products.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [notifications.restaurantId],
    references: [restaurants.id],
  }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  customer: one(customers, {
    fields: [notifications.customerId],
    references: [customers.id],
  }),
}));

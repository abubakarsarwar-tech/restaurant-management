import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Application enums — stored as native PostgreSQL ENUMs.
 *
 * Native enums are compact (4 bytes), self-documenting in `psql`, and protect
 * data at the DB boundary — the last line of defense when a script or an
 * admin console bypasses application validation.
 *
 * ⚠️ Migration rule: enums are APPEND-ONLY in Postgres. Adding a value is a
 * cheap migration; renaming/removing values requires a rewrite dance
 * (create new type → migrate column → drop old). Values below are chosen as
 * stable states; transitional workflow nuance belongs in `order_status_events`.
 */

// ── Access control ──────────────────────────────────────────────────────────
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INVITED", "SUSPENDED"]);

// ── Catalog ─────────────────────────────────────────────────────────────────
export const foodTypeEnum = pgEnum("food_type", [
  "VEGETARIAN",
  "NON_VEGETARIAN",
  "VEGAN",
]);

export const spicyLevelEnum = pgEnum("spicy_level", [
  "NONE",
  "MILD",
  "MEDIUM",
  "HOT",
  "EXTRA_HOT",
]);

/** Stock movement reasons — the audit trail for every quantity change. */
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "PURCHASE", // stock in from supplier
  "SALE", // decremented by an order
  "RETURN", // customer return back into stock
  "WASTE", // spoilage / damage write-off
  "ADJUSTMENT", // manual count correction
  "TRANSFER", // branch-to-branch transfer
]);

// ── Ordering ────────────────────────────────────────────────────────────────
export const orderTypeEnum = pgEnum("order_type", [
  "DELIVERY",
  "TAKEAWAY", // customer picks up
  "DINE_IN", // eat at a table
]);

/**
 * Order lifecycle (forward-only happy path; CANCELLED/REJECTED from anywhere
 * before completion, recorded with reason + actor in order_status_events).
 *
 *  PENDING → CONFIRMED → PREPARING → READY ─┬─ OUT_FOR_DELIVERY → DELIVERED
 *                                           ├─ (takeaway)      → COMPLETED
 *                                           └─ (dine-in)       → COMPLETED
 *  any state before completion → CANCELLED | REJECTED (restaurant declined)
 */
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
]);

export const orderSourceEnum = pgEnum("order_source", [
  "WEB",
  "ADMIN", // staff-entered (phone order)
  "POS",
  "WHATSAPP",
]);

// ── Payments ────────────────────────────────────────────────────────────────
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH", // cash on delivery / at counter
  "CARD_ON_DELIVERY", // rider carries a terminal
  "ONLINE", // gateway charge (stripe/jazzcash/easypaisa…)
  "WALLET", // in-app wallet / loyalty balance
]);

/** Order-level rollup of its payments (kept in sync from payment rows). */
export const paymentStatusEnum = pgEnum("payment_status", [
  "UNPAID",
  "PENDING", // awaiting async gateway confirmation
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "FAILED",
]);

export const paymentTransactionTypeEnum = pgEnum("payment_transaction_type", [
  "AUTHORIZATION",
  "CHARGE",
  "REFUND",
  "VOID",
]);

export const paymentTransactionStatusEnum = pgEnum("payment_transaction_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
]);

// ── Promotions ──────────────────────────────────────────────────────────────
export const discountTypeEnum = pgEnum("discount_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "FREE_DELIVERY",
]);

// ── Engagement ──────────────────────────────────────────────────────────────
export const reviewStatusEnum = pgEnum("review_status", [
  "PENDING", // awaiting moderation
  "APPROVED",
  "REJECTED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "ORDER_PLACED",
  "ORDER_STATUS",
  "PROMOTION",
  "STOCK_ALERT",
  "SYSTEM",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "EMAIL",
  "SMS",
  "PUSH",
  "WHATSAPP",
]);

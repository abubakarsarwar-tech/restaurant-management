import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { createdOnly, id, moneyCents, timestamps } from "./utils";
import {
  paymentMethodEnum,
  paymentStatusEnum,
  paymentTransactionStatusEnum,
  paymentTransactionTypeEnum,
} from "./enums";
import { orders } from "./sales";

/**
 * ── PAYMENTS DOMAIN ─────────────────────────────────────────────────────────
 * payments          — one PAYMENT ATTEMPT per logical amount due (usually one
 *                     per order; rows are retryable & refundable independently)
 * payment_transactions — every concrete gateway event (auth, charge, refund…)
 *                     belonging to an attempt; the attempt's status is the
 *                     projection of its transactions.
 *
 * orders.payment_status is a cached rollup kept current from payment rows.
 *
 * Idempotency: `idempotency_key` (unique) makes "place order" retries safe —
 * clients generate a key per cart checkout; duplicates hit the unique index
 * instead of double-charging. Non-negotiable for payment correctness.
 */

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: paymentMethodEnum("method").notNull(),
    // "manual" (cash/COD), "stripe", "paypal", "jazzcash", "easypaisa"…
    provider: varchar("provider", { length: 32 }).notNull().default("manual"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    amountCents: moneyCents("amount_cents"),
    currency: varchar("currency", { length: 3 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 80 }),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" }),
    failureReason: text("failure_reason"),
    ...timestamps,
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    index("payments_provider_status_idx").on(t.provider, t.status),
    uniqueIndex("payments_idempotency_uq").on(t.idempotencyKey),
  ],
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: id(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    type: paymentTransactionTypeEnum("type").notNull(),
    status: paymentTransactionStatusEnum("status").notNull(),
    amountCents: integer("amount_cents").notNull(), // refunds can be partial
    gatewayReference: varchar("gateway_reference", { length: 120 }), // provider txn id
    rawResponse: jsonb("raw_response"), // full provider payload for support/audit
    ...createdOnly,
  },
  (t) => [
    index("payment_transactions_payment_idx").on(t.paymentId),
    index("payment_transactions_gateway_ref_idx").on(t.gatewayReference),
  ],
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentTransactions.paymentId],
    references: [payments.id],
  }),
}));

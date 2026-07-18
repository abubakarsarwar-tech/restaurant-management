import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { id, moneyCents, timestamps } from "./utils";
import { branches } from "./core";

/**
 * ── DELIVERY FULFILMENT DOMAIN ──────────────────────────────────────────────
 * Zones are branch-scoped service areas. A `boundary` polygon (array of
 * lat/lng) enables geo containment checks — stored as jsonb so we can add a
 * PostGIS GIST index later without reshaping the table (see DATABASE.md →
 * future scalability).
 */

export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(), // "Downtown", "DHA Phase 5"
    // [{ "lat": 24.86, "lng": 67.01 }, …] — closed ring, first point repeated
    boundary: jsonb("boundary").$type<{ lat: number; lng: number }[]>(),
    minOrderCents: integer("min_order_cents").notNull().default(0),
    estimatedMinutes: integer("estimated_minutes").notNull().default(45), // base ETA
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("delivery_zones_branch_idx").on(t.branchId, t.isActive),
    check("delivery_zones_min_order_chk", sql`${t.minOrderCents} >= 0`),
  ],
);

// ── Delivery Charges (tiered per zone) ─────────────────────────────────────
// Matching rule: the applicable tier is the HIGHEST minSubtotalCents ≤ cart
// subtotal. Free delivery above a threshold = a tier whose fee is 0.
// Example: [(0 → $2.99), (2500 → $0.99), (4000 → FREE)]
export const deliveryCharges = pgTable(
  "delivery_charges",
  {
    id: id(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => deliveryZones.id, { onDelete: "cascade" }),
    minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
    feeCents: moneyCents("fee_cents"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("delivery_charges_zone_min_uq").on(t.zoneId, t.minSubtotalCents),
    index("delivery_charges_zone_idx").on(t.zoneId),
    check("delivery_charges_fee_chk", sql`${t.feeCents} >= 0`),
  ],
);

export const deliveryZonesRelations = relations(deliveryZones, ({ one, many }) => ({
  branch: one(branches, {
    fields: [deliveryZones.branchId],
    references: [branches.id],
  }),
  charges: many(deliveryCharges),
}));

export const deliveryChargesRelations = relations(deliveryCharges, ({ one }) => ({
  zone: one(deliveryZones, {
    fields: [deliveryCharges.zoneId],
    references: [deliveryZones.id],
  }),
}));

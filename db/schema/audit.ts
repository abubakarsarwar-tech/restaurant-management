import { relations } from "drizzle-orm";
import { index, inet, jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { createdOnly, id } from "./utils";
import { restaurants } from "./core";
import { users } from "./auth";

/**
 * ── AUDIT DOMAIN ────────────────────────────────────────────────────────────
 * Who changed what, when, from where — for every sensitive mutation across
 * the SaaS (price edited, role granted, coupon created, settings changed…).
 *
 * `entityId` deliberately has NO foreign key: the target is polymorphic
 * (any of 30+ entity types) and audit rows must survive the target's
 * deletion. Lookups go through the (entity_type, entity_id) index — the
 * classic audit-log trade of FK enforcement for durability.
 *
 * Rows are append-only — retention/partitioning policy in DATABASE.md.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    // NULL = platform-level action (e.g. SaaS super-admin)
    restaurantId: uuid("restaurant_id").references(() => restaurants.id, {
      onDelete: "set null",
    }),
    // NULL = system process / anonymous request
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // "products.update" | "roles.grant" | "settings.change" …
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(), // "product"
    entityId: uuid("entity_id"), // polymorphic by design
    // { "fields": ["basePriceCents"], "before": {…}, "after": {…} }
    changes: jsonb("changes").$type<{
      fields?: string[];
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    }>(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    ...createdOnly,
  },
  (t) => [
    // "Show me everything this tenant changed recently" (admin audit feed)
    index("audit_logs_restaurant_created_idx").on(t.restaurantId, t.createdAt),
    // "Full history of THIS entity" (support deep-dives)
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [auditLogs.restaurantId],
    references: [restaurants.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

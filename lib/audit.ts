import "server-only";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

/**
 * Audit trail writer — one guarded call from every admin mutation.
 * Auditing is observability, not business logic: a logging failure never
 * fails the mutation that triggered it (errors are swallowed to console).
 */
export type AuditEntry = {
  restaurantId?: string | null;
  actorUserId?: string | null;
  /** "products.create" | "categories.delete" | … */
  action: string;
  /** "product" | "category" | … */
  entityType: string;
  entityId?: string | null;
  changes?: {
    fields?: string[];
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
};

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      restaurantId: entry.restaurantId ?? null,
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      changes: entry.changes,
    });
  } catch (error) {
    console.error("[audit]", error); // audit never breaks the mutation
  }
}

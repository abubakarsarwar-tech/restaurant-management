import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ok, withApiErrors } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";

/**
 * GET /api/admin/notifications — latest 10 for the signed-in staff member,
 * newest first, with unread count (drives the topbar bell).
 */
export const dynamic = "force-dynamic";

export const GET = withApiErrors("admin.notifications", async () => {
  const session = await requireStaffApi();

  const items = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.isRead), desc(notifications.createdAt))
    .limit(10);

  const [unread] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(notifications)
    .where(
      and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)),
    );

  return ok({ unreadCount: unread?.count ?? 0, items });
});

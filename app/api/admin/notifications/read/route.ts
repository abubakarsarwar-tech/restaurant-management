import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ok, withApiErrors } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";

/** POST /api/admin/notifications/read — mark all of mine as read. */
export const POST = withApiErrors("admin.notifications.read", async () => {
  const session = await requireStaffApi();

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)),
    );

  return ok({ marked: true });
});

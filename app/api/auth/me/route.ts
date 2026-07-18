import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";

import { fail, ok, withApiErrors } from "@/lib/api";
import { getSession } from "@/features/auth/server/session";

/**
 * GET /api/auth/me — the client's session source of truth.
 * TanStack Query polls/invalidates this; 401 means signed out.
 */
export const dynamic = "force-dynamic";

export const GET = withApiErrors("auth.me", async () => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Not signed in.", 401);

  let restaurant: { id: string; name: string; slug: string } | null = null;
  const rid = session.type === "user" ? session.restaurantId : session.restaurantId;
  if (rid) {
    const [row] = await db
      .select({ id: restaurants.id, name: restaurants.name, slug: restaurants.slug })
      .from(restaurants)
      .where(eq(restaurants.id, rid))
      .limit(1);
    restaurant = row ?? null;
  }

  if (session.type === "user") {
    return ok({
      type: "user" as const,
      user: session.user,
      restaurantId: session.restaurantId,
      restaurant,
      roles: session.roles,
      permissions: [...session.permissions],
      branchIds: session.branchIds,
    });
  }

  return ok({
    type: "customer" as const,
    customer: session.customer,
    restaurantId: session.restaurantId,
    restaurant,
  });
});

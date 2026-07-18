import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { categoryUpsertSchema } from "@/features/catalog/schemas";
import { createCategory } from "@/features/catalog/server/categories.service";

/**
 * POST /api/admin/categories — create a category (with hierarchy, icon/theme,
 * imagery, editor's-choice & visibility flags).
 */
export const dynamic = "force-dynamic";

export const POST = withApiErrors("categories.create", async (request: Request) => {
  const session = await requireStaffApi("catalog:create");
  if (!session.restaurantId) {
    throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
  }

  const input = categoryUpsertSchema.parse(await request.json());
  const result = await createCategory(session.restaurantId, session.user.id, input);
  return ok(result, 201);
});

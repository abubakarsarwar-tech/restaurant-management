import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { productBulkActionSchema } from "@/features/catalog/schemas";
import { bulkUpdateProducts } from "@/features/catalog/server/products.service";

/**
 * POST /api/admin/products/bulk — apply one action to many products
 * (activate/deactivate/availability/feature/trend/delete).
 * Destructive bulk deletes require the catalog:delete permission.
 */
export const dynamic = "force-dynamic";

export const POST = withApiErrors("products.bulk", async (request: Request) => {
  const { ids, action } = productBulkActionSchema.parse(await request.json());

  const session = await requireStaffApi(
    action === "delete" ? "catalog:delete" : "catalog:update",
  );
  if (!session.restaurantId) {
    throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
  }

  const affected = await bulkUpdateProducts(
    session.restaurantId,
    session.user.id,
    ids,
    action,
  );
  return ok({ affected });
});

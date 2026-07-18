import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { productUpsertSchema } from "@/features/catalog/schemas";
import {
  deleteProducts,
  updateProduct,
} from "@/features/catalog/server/products.service";

/**
 * PATCH  /api/admin/products/[id] — full update (same contract as create).
 * DELETE /api/admin/products/[id] — soft delete (recoverable, order history
 *          snapshots are unaffected).
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiErrors(
  "products.update",
  async (request: Request, context: RouteContext) => {
    const session = await requireStaffApi("catalog:update");
    if (!session.restaurantId) {
      throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
    }

    const { id } = await context.params;
    const input = productUpsertSchema.parse(await request.json());
    await updateProduct(session.restaurantId, session.user.id, id, input);
    return ok({ id });
  },
);

export const DELETE = withApiErrors(
  "products.delete",
  async (_request: Request, context: RouteContext) => {
    const session = await requireStaffApi("catalog:delete");
    if (!session.restaurantId) {
      throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
    }

    const { id } = await context.params;
    const deleted = await deleteProducts(session.restaurantId, session.user.id, [id]);
    return ok({ deleted });
  },
);

import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { productUpsertSchema } from "@/features/catalog/schemas";
import { createProduct } from "@/features/catalog/server/products.service";

/**
 * POST /api/admin/products — create a product with its full child graph
 * (images, variants, add-ons, tags) in one transaction.
 */
export const dynamic = "force-dynamic";

export const POST = withApiErrors("products.create", async (request: Request) => {
  const session = await requireStaffApi("catalog:create");
  if (!session.restaurantId) {
    throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
  }

  const input = productUpsertSchema.parse(await request.json());
  const result = await createProduct(session.restaurantId, session.user.id, input);
  return ok(result, 201);
});

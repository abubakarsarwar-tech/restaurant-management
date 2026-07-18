import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { stockAdjustSchema } from "@/features/catalog/schemas";
import { adjustStock } from "@/features/catalog/server/products.service";

/**
 * POST /api/admin/products/[id]/stock — ledger-consistent stock adjustment
 * (purchase / waste / count correction / return / transfer) for one branch.
 */
export const dynamic = "force-dynamic";

export const POST = withApiErrors(
  "inventory.adjust",
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const session = await requireStaffApi("inventory:manage");
    if (!session.restaurantId) {
      throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
    }

    const { id } = await context.params;
    const input = stockAdjustSchema.parse(await request.json());
    const result = await adjustStock(session.restaurantId, session.user.id, id, input);
    return ok(result);
  },
);

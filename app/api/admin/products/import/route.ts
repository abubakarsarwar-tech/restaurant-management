import { z } from "zod";

import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { productImportRowSchema } from "@/features/catalog/schemas";
import { importProducts } from "@/features/catalog/server/products.service";

/**
 * POST /api/admin/products/import — validated rows (parsed client-side from
 * CSV) upserted by slug, categories auto-created by name. Per-row failures
 * are reported, never fatal for the whole batch.
 */
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  rows: z
    .array(z.object({ row: z.number().int().min(2), data: productImportRowSchema }))
    .min(1, "Nothing to import.")
    .max(500, "Import in batches of 500 or fewer."),
});

export const POST = withApiErrors("products.import", async (request: Request) => {
  const session = await requireStaffApi("catalog:create");
  if (!session.restaurantId) {
    throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
  }

  const { rows } = payloadSchema.parse(await request.json());
  const summary = await importProducts(session.restaurantId, session.user.id, rows);
  return ok(summary);
});

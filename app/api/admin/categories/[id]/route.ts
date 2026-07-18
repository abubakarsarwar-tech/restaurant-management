import { z } from "zod";

import { ok, withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { categoryUpsertSchema } from "@/features/catalog/schemas";
import {
  deleteCategory,
  patchCategoryFlags,
  updateCategory,
} from "@/features/catalog/server/categories.service";

/**
 * PATCH  /api/admin/categories/[id] — full update (dialog form) or a light
 *         flags patch ({ isActive | isEditorsChoice | sortOrder }) for the
 *         inline table controls.
 * DELETE /api/admin/categories/[id] — soft delete; 409 while products remain.
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const flagsSchema = z
  .object({
    isActive: z.boolean().optional(),
    isEditorsChoice: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(100_000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nothing to patch.",
  });

export const PATCH = withApiErrors(
  "categories.update",
  async (request: Request, context: RouteContext) => {
    const session = await requireStaffApi("catalog:update");
    if (!session.restaurantId) {
      throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
    }
    const { id } = await context.params;
    const body: unknown = await request.json();

    // Light patch when the payload only carries flag keys.
    const isLightPatch =
      body !== null &&
      typeof body === "object" &&
      Object.keys(body as object).every((k) =>
        ["isActive", "isEditorsChoice", "sortOrder"].includes(k),
      );

    if (isLightPatch) {
      const patch = flagsSchema.parse(body);
      await patchCategoryFlags(session.restaurantId, session.user.id, id, patch);
    } else {
      const input = categoryUpsertSchema.parse(body);
      await updateCategory(session.restaurantId, session.user.id, id, input);
    }

    return ok({ id });
  },
);

export const DELETE = withApiErrors(
  "categories.delete",
  async (_request: Request, context: RouteContext) => {
    const session = await requireStaffApi("catalog:delete");
    if (!session.restaurantId) {
      throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
    }

    const { id } = await context.params;
    await deleteCategory(session.restaurantId, session.user.id, id);
    return ok({ id });
  },
);

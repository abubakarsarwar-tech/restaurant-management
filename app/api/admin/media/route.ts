import { z } from "zod";

import { ok, withApiErrors, HttpError } from "@/lib/api";
import { hasPermission, requireStaffApi } from "@/features/auth/server/session";
import {
  listMediaAssets,
  registerMediaAsset,
} from "@/features/media/server/media.service";

/**
 * GET  /api/admin/media — paginated asset listing (picker & library).
 * POST /api/admin/media — register a browser-completed Cloudinary upload.
 */
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  publicId: z.string().min(1).max(255),
  secureUrl: z.url(),
  format: z.string().max(12).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes: z.number().int().positive().optional(),
  folder: z.string().min(1).max(120),
  alt: z.string().max(255).optional(),
});

function assertRestaurant(session: Awaited<ReturnType<typeof requireStaffApi>>) {
  if (!session.restaurantId) {
    throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
  }
  return session.restaurantId;
}

export const GET = withApiErrors("media.list", async (request: Request) => {
  const session = await requireStaffApi();
  const restaurantId = assertRestaurant(session);

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(6, Number(params.get("pageSize")) || 24));

  return ok(
    await listMediaAssets(restaurantId, {
      folder: params.get("folder") ?? undefined,
      q: params.get("q") ?? undefined,
      page,
      pageSize,
    }),
  );
});

export const POST = withApiErrors("media.register", async (request: Request) => {
  const session = await requireStaffApi();
  const canUpload = ["media:manage", "catalog:update", "catalog:create"].some((p) =>
    hasPermission(session, p),
  );
  if (!canUpload) {
    throw new HttpError(403, "FORBIDDEN", "You don't have permission to upload media.");
  }
  const restaurantId = assertRestaurant(session);

  const input = registerSchema.parse(await request.json());
  const asset = await registerMediaAsset(restaurantId, session.user.id, input);
  return ok(asset, 201);
});

import { z } from "zod";

import { ok, withApiErrors, HttpError } from "@/lib/api";
import { hasPermission, requireStaffApi } from "@/features/auth/server/session";
import {
  createUploadSignature,
  isUploadFolder,
} from "@/features/media/server/media.service";

/**
 * POST /api/admin/media/sign — mint a short-lived Cloudinary upload signature
 * so the browser uploads straight to Cloudinary (server never proxies bytes).
 * Allowed for staff who manage media or edit the catalog.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({ folder: z.string() });

export const POST = withApiErrors("media.sign", async (request: Request) => {
  const session = await requireStaffApi();
  const canUpload = ["media:manage", "catalog:update", "catalog:create"].some((p) =>
    hasPermission(session, p),
  );
  if (!canUpload) {
    throw new HttpError(403, "FORBIDDEN", "You don't have permission to upload media.");
  }

  const { folder } = bodySchema.parse(await request.json());
  if (!isUploadFolder(folder)) {
    throw new HttpError(422, "VALIDATION_ERROR", "Unknown upload folder.");
  }

  return ok(createUploadSignature(folder));
});

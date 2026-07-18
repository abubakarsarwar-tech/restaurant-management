import "server-only";

import { and, desc, eq, ilike, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { cloudinary } from "@/lib/cloudinary";
import { HttpError } from "@/lib/api";
import { env, publicEnv } from "@/config/env";
import { writeAudit } from "@/lib/audit";

/**
 * Media service — Cloudinary signed uploads (browser → Cloudinary direct,
 * server never touches the bytes) plus the central media_assets registry
 * every other domain references by FK.
 */

/** Folders tenants may upload into (prevents arbitrary path injection). */
export const UPLOAD_FOLDERS = [
  "restaurant/dishes",
  "restaurant/categories",
  "restaurant/banners",
  "restaurant/branding",
] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export function isUploadFolder(value: string): value is UploadFolder {
  return (UPLOAD_FOLDERS as readonly string[]).includes(value);
}

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export function createUploadSignature(folder: UploadFolder): UploadSignature {
  if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new HttpError(
      503,
      "INTEGRATION_UNAVAILABLE",
      "Image uploads aren't configured yet. Add Cloudinary credentials to the environment.",
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    cloudName: publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
  };
}

export type RegisterAssetInput = {
  publicId: string;
  secureUrl: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  folder: string;
  alt?: string;
};

export async function registerMediaAsset(
  restaurantId: string,
  userId: string,
  input: RegisterAssetInput,
) {
  if (!input.secureUrl.startsWith("https://res.cloudinary.com/")) {
    throw new HttpError(422, "VALIDATION_ERROR", "Unexpected asset origin.");
  }

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      restaurantId,
      provider: "cloudinary",
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      format: input.format ?? "webp",
      width: input.width ?? null,
      height: input.height ?? null,
      bytes: input.bytes ?? null,
      folder: input.folder,
      alt: input.alt ?? null,
      uploadedByUserId: userId,
    })
    .onConflictDoNothing({
      target: [mediaAssets.provider, mediaAssets.publicId],
    })
    .returning();

  // Re-uploading the same asset returns the existing registry row.
  if (asset) return asset;
  const [existing] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.provider, "cloudinary"),
        eq(mediaAssets.publicId, input.publicId),
      ),
    )
    .limit(1);
  return existing!;
}

export type MediaListQuery = {
  folder?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export async function listMediaAssets(restaurantId: string, query: MediaListQuery) {
  const filters: SQL[] = [eq(mediaAssets.restaurantId, restaurantId)];
  if (query.folder) filters.push(eq(mediaAssets.folder, query.folder));
  if (query.q) {
    filters.push(ilike(mediaAssets.alt, `%${query.q}%`));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(mediaAssets)
    .where(and(...filters));

  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(...filters))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return { rows, total: count };
}

export async function deleteMediaAsset(
  restaurantId: string,
  actorUserId: string,
  assetId: string,
) {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.restaurantId, restaurantId)))
    .limit(1);
  if (!asset) throw new HttpError(404, "NOT_FOUND", "Asset not found.");

  try {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  } catch {
    // product_images.media_id (and similar) use ON DELETE RESTRICT.
    throw new HttpError(
      409,
      "CONFLICT",
      "This asset is in use (product gallery, banner, logo…). Detach it there first.",
    );
  }

  // Best-effort remote cleanup — the registry row is already gone; an
  // orphaned Cloudinary object is recoverable, a broken FK isn't.
  try {
    await cloudinary.uploader.destroy(asset.publicId);
  } catch (error) {
    console.error("[media:cloudinary-destroy]", error);
  }

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "media.delete",
    entityType: "media_asset",
    entityId: asset.id,
    changes: { before: { publicId: asset.publicId } },
  });
}

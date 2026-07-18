"use client";

import { api } from "@/services/api-client";
import type { MediaAssetRef } from "@/features/media/types";

/**
 * Browser-side media service — signed direct-to-Cloudinary uploads plus the
 * small registry API. Server never proxies file bytes; it only signs and
 * registers, keeping uploads fast and the API cheap.
 */

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

type CloudinaryUploadResponse = {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  error?: { message: string };
};

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Sign → upload → register. Throws Error with a friendly message on failure. */
export async function uploadImage(file: File, folder: string): Promise<MediaAssetRef> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP or AVIF images are supported.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Image is too large — keep it under 8 MB.");
  }

  const signature = await api.post<UploadSignature>("/admin/media/sign", { folder });

  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signature.apiKey);
  body.set("timestamp", String(signature.timestamp));
  body.set("signature", signature.signature);
  body.set("folder", signature.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: "POST", body },
  );
  const result = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || result.error) {
    throw new Error(result.error?.message ?? "Upload failed. Please try again.");
  }

  return api.post<MediaAssetRef>("/admin/media", {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    folder: signature.folder,
    alt: file.name.replace(/\.[a-z0-9]+$/i, "").replaceAll(/[-_]+/g, " "),
  });
}

export async function listAssets(options: {
  folder?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: MediaAssetRef[]; total: number }> {
  return api.get("/admin/media", {
    params: {
      folder: options.folder,
      q: options.q,
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 24,
    },
  });
}

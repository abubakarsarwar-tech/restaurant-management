import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env, publicEnv } from "@/config/env";

/**
 * Cloudinary singleton — server-side SDK used by API routes for signed
 * uploads / deletes of dish photos. Browser delivery uses the public
 * cloud name via `next-cloudinary`'s <CldImage />.
 */
cloudinary.config({
  cloud_name: publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const CLOUDINARY_FOLDERS = {
  dishes: "restaurant/dishes",
  categories: "restaurant/categories",
  banners: "restaurant/banners",
} as const;

export { cloudinary };
export default cloudinary;

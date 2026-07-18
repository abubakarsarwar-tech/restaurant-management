import { z } from "zod";

/**
 * Client-safe environment — can be imported from Client Components.
 * Contains ONLY NEXT_PUBLIC_* values (inlined at build time by Next.js).
 * Any secret must live in `config/env.ts` instead.
 */

const publicClientSchema = z.object({
  appUrl: z.url().default("http://localhost:3000"),
  googleMapsApiKey: z.string().default(""),
  cloudinaryCloudName: z.string().default(""),
  whatsappNumber: z.string().default(""),
  currency: z.string().length(3).default("USD"),
  locale: z.string().default("en-US"),
});

export const envClient = publicClientSchema.parse({
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "USD",
  locale: process.env.NEXT_PUBLIC_LOCALE ?? "en-US",
});

export type EnvClient = z.infer<typeof publicClientSchema>;

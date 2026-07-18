import "server-only";

import { z } from "zod";

/**
 * ── Environment contract ──────────────────────────────────────────────────
 * Single validated source of truth for ALL environment variables.
 * The app refuses to boot with a helpful error if anything is missing or
 * malformed — misconfiguration fails fast, never silently at 2am.
 *
 * Server-only: import from server code (Server Components, Route Handlers,
 * Server Actions). Client code should read `NEXT_PUBLIC_*` values via
 * `config/env.public.ts`.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- Database
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "DATABASE_URL must be a valid postgresql:// connection string",
  }),
  DIRECT_URL: z.url().optional(), // for future pooled/proxy setups

  // --- Auth
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters — run: openssl rand -base64 64"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // --- Cloudinary (server secrets used by API routes for signed uploads)
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(
      /^\d{7,15}$/,
      "WhatsApp number must be digits only, international format without '+'",
    )
    .optional()
    .or(z.literal("")),
  NEXT_PUBLIC_CURRENCY: z.string().length(3).default("USD"),
  NEXT_PUBLIC_LOCALE: z.string().default("en-US"),
});

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  ✗ ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

const parsedServer = serverSchema.safeParse(process.env);
if (!parsedServer.success) {
  console.error(
    `\n❌ Invalid server environment variables:\n${formatIssues(parsedServer.error)}\n👉 Check .env against .env.example\n`,
  );
  throw new Error("Invalid server environment variables");
}

const parsedPublic = publicSchema.safeParse(process.env);
if (!parsedPublic.success) {
  console.error(
    `\n❌ Invalid public environment variables:\n${formatIssues(parsedPublic.error)}\n👉 Check .env against .env.example\n`,
  );
  throw new Error("Invalid public environment variables");
}

/** Validated server environment — never ship to the client. */
export const env = parsedServer.data;
/** Validated NEXT_PUBLIC_* values. */
export const publicEnv = parsedPublic.data;

export type Env = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

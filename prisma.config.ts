import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7 style).
 *
 * - `datasource.url` is used by Migrate/Studio/db push (never shipped to
 *   the app bundle). The runtime client connects via the driver adapter
 *   in lib/prisma.ts instead.
 * - When this file exists the CLI does NOT auto-load .env — hence the
 *   explicit `dotenv/config` import above.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

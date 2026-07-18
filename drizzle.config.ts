import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * - `schema` points at the schema barrel (db/schema/index.ts) — every table,
 *   enum and relation is discovered from there.
 * - `out` holds generated SQL migrations — COMMITTED to git and reviewed
 *   like code (see docs/DATABASE.md → Migration Strategy).
 * - `strict` + `verbose` make generate ask before destructive diffs.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});

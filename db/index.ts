/**
 * Database public API.
 *
 *   import { db, products } from "@/db";
 *
 * - `db`       → Drizzle client (server-only)
 * - `*Schema`  → table & enum definitions for typed queries
 * - Types      → infer models via `typeof products.$inferSelect`
 */
export { db, type DbClient, default } from "./client";
export * as schema from "./schema";

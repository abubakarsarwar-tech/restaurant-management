import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/config/env";
import * as schema from "@/db/schema";

/**
 * Drizzle client singleton (postgres.js driver).
 *
 * - One connection pool per process, cached on globalThis so Next.js dev
 *   hot-reloads (which clear the module cache) can't open new pools.
 * - `max: 10` per instance — sized for horizontal scaling: many small
 *   serverless/shard pools instead of one swamp of sockets.
 * - Full relational schema attached → `db.query.*` auto-join API with
 *   end-to-end inference.
 */

function createDb() {
  const queryClient = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // UTC everywhere; app layer formats to tenant timezone for display.
  });

  return drizzle(queryClient, { schema });
}

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

export const db = globalForDb.db ?? createDb();

if (env.NODE_ENV !== "production") globalForDb.db = db;

export type DbClient = typeof db;
export default db;

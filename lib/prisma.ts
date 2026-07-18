import "server-only";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { env } from "@/config/env";

/**
 * Prisma singleton (Prisma 7 — Rust-free client + driver adapter).
 *
 * Instead of a native query engine, the generated client talks to MySQL
 * through the `mariadb` driver adapter: smaller bundles, edge-friendly
 * architecture, and one less binary in cold starts.
 *
 * The global cache guarantees exactly ONE connection pool per process,
 * even with Next.js dev-mode hot reloads (which clear the module cache).
 *
 * Note: `@/lib/generated/prisma` is produced by `pnpm db:generate`
 * (gitignored — regenerate after every schema change; also runs in CI).
 */

/** Parse mysql:// URLs into a mariadb PoolConfig (pool knobs included). */
function poolConfigFromUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // Modest per-instance pool ceiling: scale horizontally instead of
    // holding hundreds of sockets open — serverless-friendly posture.
    connectionLimit: 5,
  };
}

function createPrismaClient() {
  const adapter = new PrismaMariaDb(poolConfigFromUrl(env.DATABASE_URL));

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

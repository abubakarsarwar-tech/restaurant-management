import "server-only";

import bcrypt from "bcrypt";

import { env } from "@/config/env";

/**
 * Password hashing service (infrastructure layer).
 * Cost factor is env-driven so production can raise it without a deploy.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

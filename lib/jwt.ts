import "server-only";

import jwt from "jsonwebtoken";

import { env } from "@/config/env";

/**
 * Token service (infrastructure layer).
 * The auth FEATURE (login/register routes, session guard, role checks)
 * arrives in a later part and will build on these helpers.
 */

export type AppJwtPayload = {
  sub: string; // user id
  role: "CUSTOMER" | "ADMIN" | "STAFF";
  name?: string;
};

export function signAccessToken(payload: AppJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AppJwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AppJwtPayload;
  } catch {
    return null; // expired / malformed → caller treats as anonymous
  }
}

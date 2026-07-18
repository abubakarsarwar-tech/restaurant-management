import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

/**
 * Token service — environment-agnostic (Node + Edge) JWT helpers built on
 * `jose` (HS256). Intentionally NOT marked `server-only`: Next.js middleware
 * (edge runtime) verifies signatures with this same module. It must never
 * import the DB or any Node-only dependency.
 *
 * Tokens are deliberately SLIM — identity only. Permissions/roles are
 * resolved live from the database per request (features/auth/server/session)
 * so RBAC changes apply instantly; revocation is enforced by the short
 * access TTL plus the refresh-session table.
 */

export type TokenIdentityType = "user" | "customer";

export type AccessTokenPayload = {
  /** subject — id of the user (staff) or customer */
  sub: string;
  /** which identity table the subject belongs to */
  t: TokenIdentityType;
  /** active restaurant (tenant) context */
  rid?: string;
};

export type RefreshTokenPayload = {
  sub: string;
  t: TokenIdentityType;
  /** session id → row in auth_sessions holding this token's hash */
  sid: string;
};

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // env.ts enforces this at boot for the app; middleware must fail closed.
    throw new Error("JWT_SECRET is missing or too short (min 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ t: payload.t, rid: payload.rid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("saffron-table")
    .setAudience("web")
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ t: payload.t, sid: payload.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("saffron-table")
    .setAudience("web-refresh")
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

async function verify<T extends object>(
  token: string,
  audience: string,
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "saffron-table",
      audience,
    });
    return payload as unknown as T;
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWTInvalid ||
      error instanceof joseErrors.JWSSignatureVerificationFailed ||
      error instanceof joseErrors.JWTClaimValidationFailed
    ) {
      return null;
    }
    throw error;
  }
}

export const verifyAccessToken = (token: string) =>
  verify<AccessTokenPayload & { sub: string }>(token, "web");

export const verifyRefreshToken = (token: string) =>
  verify<RefreshTokenPayload & { sub: string }>(token, "web-refresh");

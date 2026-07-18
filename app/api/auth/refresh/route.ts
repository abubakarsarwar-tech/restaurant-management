import { type NextRequest } from "next/server";

import { HttpError, ok, withApiErrors } from "@/lib/api";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { AUTH_COOKIES } from "@/features/auth/constants";
import { clearAuthCookies, setAuthCookies } from "@/features/auth/server/cookies";
import {
  createAuthSession,
  findLiveSession,
  hashRefreshToken,
  revokeSession,
} from "@/features/auth/server/session-store";

/**
 * POST /api/auth/refresh — rotate the token pair.
 *
 * Security: refresh tokens are single-use. A presented token whose hash no
 * longer matches the stored session row is REUSE EVIDENCE (stolen token) —
 * the whole session is revoked and the client is signed out.
 */
export const POST = withApiErrors("auth.refresh", async (request: NextRequest) => {
  const cookie = request.cookies.get(AUTH_COOKIES.refresh)?.value;
  if (!cookie) {
    throw new HttpError(401, "UNAUTHORIZED", "Session expired. Please sign in again.");
  }

  let payload;
  try {
    payload = await verifyRefreshToken(cookie);
  } catch {
    payload = null;
  }
  if (!payload) {
    const res = ok({ rotated: false }, 401);
    return clearAuthCookies(res);
  }

  const session = await findLiveSession(payload.sid);

  // Live session but hash mismatch → old/stolen token replay → kill session.
  if (session && session.refreshTokenHash !== hashRefreshToken(cookie)) {
    await revokeSession(payload.sid);
    const res = ok({ rotated: false }, 401);
    return clearAuthCookies(res);
  }

  if (!session) {
    const res = ok({ rotated: false }, 401);
    return clearAuthCookies(res);
  }

  // Rotate: revoke old row, mint a fresh session with a new sid.
  await revokeSession(payload.sid);

  const newSessionId = crypto.randomUUID();
  const identity =
    payload.t === "user" ? { userId: payload.sub } : { customerId: payload.sub };

  const refreshToken = await signRefreshToken({
    sub: payload.sub,
    t: payload.t,
    sid: newSessionId,
  });
  await createAuthSession(newSessionId, identity, refreshToken, {
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  const accessToken = await signAccessToken({
    sub: payload.sub,
    t: payload.t,
    // rid lives only on access payloads; re-resolved on next login/me call
  });

  const response = ok({ rotated: true }, 200);
  return setAuthCookies(response, { accessToken, refreshToken });
});

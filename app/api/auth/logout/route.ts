import { type NextRequest } from "next/server";

import { ok, withApiErrors } from "@/lib/api";
import { verifyRefreshToken } from "@/lib/jwt";
import { AUTH_COOKIES } from "@/features/auth/constants";
import { clearAuthCookies } from "@/features/auth/server/cookies";
import { revokeSession } from "@/features/auth/server/session-store";

/** POST /api/auth/logout — revoke the refresh session & clear cookies. */
export const POST = withApiErrors("auth.logout", async (request: NextRequest) => {
  const cookie = request.cookies.get(AUTH_COOKIES.refresh)?.value;

  if (cookie) {
    const payload = await verifyRefreshToken(cookie).catch(() => null);
    if (payload) await revokeSession(payload.sid);
  }

  const response = ok({ signedOut: true });
  return clearAuthCookies(response);
});

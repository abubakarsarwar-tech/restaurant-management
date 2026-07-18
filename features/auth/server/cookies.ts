import type { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_COOKIES,
  authCookieOptions,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/features/auth/constants";

/**
 * Cookie writers for Route Handlers (response-side API). Reading is done
 * via next/headers `cookies()` in session.ts.
 */
export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  response.cookies.set(AUTH_COOKIES.access, tokens.accessToken, {
    ...authCookieOptions(ACCESS_TOKEN_TTL_SECONDS),
    // access token may live 60s past expiry to smooth rotation races
    maxAge: ACCESS_TOKEN_TTL_SECONDS + 60,
  });
  response.cookies.set(AUTH_COOKIES.refresh, tokens.refreshToken, {
    ...authCookieOptions(REFRESH_TOKEN_TTL_SECONDS),
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIES.access, "", { ...authCookieOptions(0), maxAge: 0 });
  response.cookies.set(AUTH_COOKIES.refresh, "", { ...authCookieOptions(0), maxAge: 0 });
  return response;
}

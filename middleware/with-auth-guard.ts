import { NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/jwt";
import { AUTH_COOKIES, PROTECTED_PREFIXES, AUTH_ROUTES } from "@/features/auth/constants";

import type { MiddlewareFactory } from "./chain";

/**
 * withAuthGuard — the EDGE gate. Fast, redirect-only:
 *
 *  - /admin/**   requires a "user" (staff) access token
 *  - /account/** requires a "customer" token
 *  - /login      bounces already-authenticated visitors to their home area
 *
 * It deliberately does NOT hit the DB (edge runtime, no Node APIs) and does
 * NOT make fine-grained permission decisions — RSC layouts & route handlers
 * re-verify with full RBAC (session.ts). Defense in depth: middleware keeps
 * anonymous traffic out; the server enforces permissions.
 */
export const withAuthGuard: MiddlewareFactory =
  (nextMiddleware) => async (request, event) => {
    const { pathname, search } = request.nextUrl;

    const needsStaff = PROTECTED_PREFIXES.staff.some((p) => pathname.startsWith(p));
    const needsCustomer = PROTECTED_PREFIXES.customer.some((p) => pathname.startsWith(p));
    const isAuthPage =
      pathname === AUTH_ROUTES.login || pathname === AUTH_ROUTES.register;

    if (!needsStaff && !needsCustomer && !isAuthPage) {
      return nextMiddleware(request, event);
    }

    const token = request.cookies.get(AUTH_COOKIES.access)?.value;
    let type: "user" | "customer" | null = null;
    if (token) {
      try {
        const payload = await verifyAccessToken(token);
        type = payload?.t ?? null;
      } catch {
        type = null; // secret misconfiguration → fail closed
      }
    }

    if (isAuthPage) {
      if (type === "user") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (type === "customer") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return nextMiddleware(request, event);
    }

    if (needsStaff && type !== "user") {
      const url = new URL(AUTH_ROUTES.login, request.url);
      url.searchParams.set("as", "staff");
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }

    if (needsCustomer && type !== "customer") {
      const url = new URL(AUTH_ROUTES.login, request.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }

    return nextMiddleware(request, event);
  };

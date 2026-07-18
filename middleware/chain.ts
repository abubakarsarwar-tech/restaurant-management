import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

/**
 * Middleware composition helper ("middleware chain of responsibility").
 *
 * In later parts we stack behaviors — auth guard, locale resolution,
 * rate limiting headers — as small composable units instead of one
 * 400-line middleware file:
 *
 *   export default chain([withSecurityHeaders, withAuthGuard]);
 *
 * Each factory receives the next middleware and decides whether to
 * short-circuit (redirect/rewrite) or delegate.
 */

export type Middleware = (
  request: NextRequest,
  event: NextFetchEvent,
) => NextResponse | Promise<NextResponse>;

export type MiddlewareFactory = (next: Middleware) => Middleware;

export function chain(
  factories: MiddlewareFactory[],
  terminal: Middleware = () => NextResponse.next(),
): Middleware {
  return factories.reduceRight<Middleware>((next, factory) => factory(next), terminal);
}

/** Adds baseline security headers to every response. */
export const withSecurityHeaders: MiddlewareFactory =
  (next) => async (request, event) => {
    const response = await next(request, event);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  };

// 🔒 withAuthGuard arrives with the auth part — it will compose here:
// redirecting anonymous users away from /admin and /checkout, and
// attaching the verified session to request headers for route handlers.

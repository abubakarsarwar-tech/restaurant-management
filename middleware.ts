import { chain, withSecurityHeaders } from "@/middleware/chain";

/**
 * Root middleware — currently applies security headers.
 * Auth guard, locale routing and rate limiting plug into the chain
 * (see middleware/chain.ts) in their respective parts.
 */
export default chain([withSecurityHeaders]);

export const config = {
  /*
   * Run on everything except static assets and image optimization.
   * The negative lookahead keeps middleware off the hot static path.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

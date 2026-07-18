import { chain, withSecurityHeaders } from "@/middleware/chain";
import { withAuthGuard } from "@/middleware/with-auth-guard";

/**
 * Root middleware — security headers for everything, then the auth gate
 * for protected prefixes (see middleware/with-auth-guard.ts).
 */
export default chain([withSecurityHeaders, withAuthGuard]);

export const config = {
  /*
   * Run on everything except static assets and image optimization.
   * The negative lookahead keeps middleware off the hot static path.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

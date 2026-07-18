import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { auditLogs, customers, roles, userRoles, users } from "@/db/schema";
import { HttpError, ok, withApiErrors } from "@/lib/api";
import { verifyPassword } from "@/lib/hash";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { resolveStorefrontRestaurant } from "@/lib/tenancy";
import { loginSchema } from "@/features/auth/schemas";
import { setAuthCookies } from "@/features/auth/server/cookies";
import { createAuthSession } from "@/features/auth/server/session-store";
import { defaultRedirectFor } from "@/features/auth/constants";

/**
 * POST /api/auth/login — unified sign-in for BOTH identities.
 * Identifier containing "@" → staff (users, by email). Otherwise → customer
 * (by phone, within the storefront tenant). Never reveals which part failed.
 */

type LoginResult = {
  identity: { kind: "staff" | "customer"; id: string; displayName: string };
  restaurantId: string | null;
  redirectTo: string;
};

function safeNext(next: string | null, fallback: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

async function audit(entry: {
  actorUserId?: string | null;
  restaurantId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  request: NextRequest;
}) {
  try {
    await db.insert(auditLogs).values({
      restaurantId: entry.restaurantId ?? null,
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userAgent: entry.request.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("[auth:audit]", error); // audit never breaks auth
  }
}

async function issueTokensAndRespond(
  request: NextRequest,
  identity: { userId: string } | { customerId: string },
  type: "user" | "customer",
  restaurantId: string | null,
  result: LoginResult,
): Promise<NextResponse> {
  const accessToken = await signAccessToken({
    sub: "userId" in identity ? identity.userId : identity.customerId,
    t: type,
    rid: restaurantId ?? undefined,
  });

  // Session id is the refresh token's sid claim — mint it by creating the
  // session row AFTER signing a token containing a generated uuid.
  const sessionId = crypto.randomUUID();
  const refreshToken = await signRefreshToken({
    sub: "userId" in identity ? identity.userId : identity.customerId,
    t: type,
    sid: sessionId,
  });

  await createAuthSession(sessionId, identity, refreshToken, {
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  const response = ok(result, 200);
  return setAuthCookies(response, { accessToken, refreshToken });
}

export const POST = withApiErrors("auth.login", async (request: NextRequest) => {
  const body = loginSchema.parse(await request.json());
  const identifier = body.identifier.trim();
  const next = safeNext(request.nextUrl.searchParams.get("next"), "");

  const invalid = () => new HttpError(401, "UNAUTHORIZED", "Invalid credentials.");

  // ── Staff (email) ─────────────────────────────────────────────────────────
  if (identifier.includes("@")) {
    const email = identifier.toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || user.status !== "ACTIVE" || !user.passwordHash) throw invalid();
    if (!(await verifyPassword(body.password, user.passwordHash))) {
      await audit({
        action: "auth.login_failed",
        entityType: "user",
        entityId: user.id,
        request,
      });
      throw invalid();
    }

    const [membership] = await db
      .select({ restaurantId: roles.restaurantId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.userId, user.id), isNotNull(roles.restaurantId)))
      .limit(1);
    const restaurantId = membership?.restaurantId ?? null;

    if (!restaurantId && !user.isPlatformAdmin) {
      throw new HttpError(403, "FORBIDDEN", "This account has no restaurant access yet.");
    }

    const result: LoginResult = {
      identity: { kind: "staff", id: user.id, displayName: user.fullName },
      restaurantId,
      redirectTo: next || defaultRedirectFor("staff"),
    };

    await audit({
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      restaurantId,
      actorUserId: user.id,
      request,
    });
    return issueTokensAndRespond(
      request,
      { userId: user.id },
      "user",
      restaurantId,
      result,
    );
  }

  // ── Customer (phone) ──────────────────────────────────────────────────────
  const storefront = await resolveStorefrontRestaurant();
  if (!storefront)
    throw new HttpError(500, "INTERNAL_ERROR", "Storefront is not configured.");

  const phone = identifier.replace(/\s+/g, "");
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.restaurantId, storefront.id), eq(customers.phone, phone)))
    .limit(1);

  if (!customer || !customer.isActive || customer.deletedAt || !customer.passwordHash) {
    throw invalid();
  }
  if (!(await verifyPassword(body.password, customer.passwordHash))) throw invalid();

  const result: LoginResult = {
    identity: { kind: "customer", id: customer.id, displayName: customer.fullName },
    restaurantId: customer.restaurantId,
    redirectTo: next || defaultRedirectFor("customer"),
  };

  return issueTokensAndRespond(
    request,
    { customerId: customer.id },
    "customer",
    customer.restaurantId,
    result,
  );
});

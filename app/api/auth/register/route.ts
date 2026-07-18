import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { HttpError, ok, withApiErrors } from "@/lib/api";
import { hashPassword } from "@/lib/hash";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { resolveStorefrontRestaurant } from "@/lib/tenancy";
import { customerRegisterSchema } from "@/features/auth/schemas";
import { setAuthCookies } from "@/features/auth/server/cookies";
import { createAuthSession } from "@/features/auth/server/session-store";
import { defaultRedirectFor } from "@/features/auth/constants";

/**
 * POST /api/auth/register — customer self-registration (storefront).
 * Staff accounts are provisioned by owners via admin (staff:manage), never
 * by public registration — that's a deliberate security boundary.
 */
export const POST = withApiErrors("auth.register", async (request: NextRequest) => {
  const body = customerRegisterSchema.parse(await request.json());

  const storefront = await resolveStorefrontRestaurant();
  if (!storefront) {
    throw new HttpError(500, "INTERNAL_ERROR", "Storefront is not configured.");
  }

  const phone = body.phone.replace(/\s+/g, "");
  const email = body.email?.trim().toLowerCase() || null;

  const [existing] = await db
    .select({ id: customers.id, passwordHash: customers.passwordHash })
    .from(customers)
    .where(and(eq(customers.restaurantId, storefront.id), eq(customers.phone, phone)))
    .limit(1);

  if (existing?.passwordHash) {
    throw new HttpError(
      409,
      "CONFLICT",
      "An account with this phone number already exists.",
    );
  }

  const passwordHash = await hashPassword(body.password);

  let customerId: string;
  if (existing) {
    // Guest row from a previous order → claim it (history & loyalty preserved)
    await db
      .update(customers)
      .set({
        fullName: body.fullName,
        email,
        passwordHash,
      })
      .where(eq(customers.id, existing.id));
    customerId = existing.id;
  } else {
    const [row] = await db
      .insert(customers)
      .values({
        restaurantId: storefront.id,
        fullName: body.fullName,
        phone,
        email,
        passwordHash,
      })
      .returning({ id: customers.id });
    customerId = row.id;
  }

  // Auto sign-in after registration (welcome flow)
  const sessionId = crypto.randomUUID();
  const accessToken = await signAccessToken({
    sub: customerId,
    t: "customer",
    rid: storefront.id,
  });
  const refreshToken = await signRefreshToken({
    sub: customerId,
    t: "customer",
    sid: sessionId,
  });
  await createAuthSession(sessionId, { customerId }, refreshToken, {
    userAgent: request.headers.get("user-agent"),
  });

  const response: NextResponse = ok(
    {
      identity: { kind: "customer" as const, id: customerId, displayName: body.fullName },
      restaurantId: storefront.id,
      redirectTo: defaultRedirectFor("customer"),
    },
    201,
  );
  return setAuthCookies(response, { accessToken, refreshToken });
});

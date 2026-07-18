import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  customers,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import { verifyAccessToken, type TokenIdentityType } from "@/lib/jwt";
import { HttpError } from "@/lib/api";
import { AUTH_COOKIES } from "@/features/auth/constants";

/**
 * Session resolution & RBAC guards — the ONLY module that answers
 * "who is making this request" for Server Components, Route Handlers
 * and Server Actions.
 *
 * Access tokens stay tiny (identity only); this loader resolves the full
 * authorization context LIVE from the RBAC tables on every request, so a
 * manager revoked 3 seconds ago is out — not 15 minutes from now.
 * `cache()` dedupes the lookup within a single server render.
 */

export type StaffSession = {
  type: "user";
  user: {
    id: string;
    fullName: string;
    email: string;
    isPlatformAdmin: boolean;
    status: string;
  };
  /** active tenant context (restaurant the token is scoped to) */
  restaurantId: string | null;
  /** effective role names within the active tenant */
  roles: string[];
  /** flattened, deduped permission keys */
  permissions: Set<string>;
  /** branch ids the user is pinned to (empty = all branches) */
  branchIds: string[];
};

export type CustomerSession = {
  type: "customer";
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    loyaltyPoints: number;
  };
  restaurantId: string;
};

export type AuthSession = StaffSession | CustomerSession;

async function loadStaffSession(
  userId: string,
  restaurantIdHint: string | undefined,
): Promise<StaffSession | null> {
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      isPlatformAdmin: users.isPlatformAdmin,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.status !== "ACTIVE") return null;

  // Resolve role assignments (optionally filtered to the token's tenant).
  const assignments = await db
    .select({
      roleName: roles.name,
      roleId: roles.id,
      restaurantId: roles.restaurantId,
      branchId: userRoles.branchId,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const restaurantId =
    restaurantIdHint ?? assignments.find((a) => a.restaurantId)?.restaurantId ?? null;

  const inTenant = assignments.filter(
    (a) => !restaurantId || a.restaurantId === restaurantId,
  );

  const roleIds = [...new Set(inTenant.map((a) => a.roleId))];
  const permRows = roleIds.length
    ? await db
        .select({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIds))
    : [];

  const permKeys = new Set<string>(permRows.map((r) => r.key));

  return {
    type: "user",
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      status: user.status,
    },
    restaurantId,
    roles: [...new Set(inTenant.map((a) => a.roleName))],
    permissions: permKeys,
    branchIds: inTenant.map((a) => a.branchId).filter((b): b is string => Boolean(b)),
  };
}

async function loadCustomerSession(customerId: string): Promise<CustomerSession | null> {
  const [customer] = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
      loyaltyPoints: customers.loyaltyPoints,
      restaurantId: customers.restaurantId,
      isActive: customers.isActive,
      deletedAt: customers.deletedAt,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer || !customer.isActive || customer.deletedAt) return null;

  return {
    type: "customer",
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      loyaltyPoints: customer.loyaltyPoints,
    },
    restaurantId: customer.restaurantId,
  };
}

/** Identity as verified from the request cookies (null = anonymous). */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const store = await cookies();
  const token = store.get(AUTH_COOKIES.access)?.value;
  if (!token) return null;

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    return null; // misconfigured secret → fail closed
  }
  if (!payload) return null;

  const type: TokenIdentityType = payload.t;
  return type === "user"
    ? loadStaffSession(payload.sub, payload.rid)
    : loadCustomerSession(payload.sub);
});

/** Permission check against a session (platform admins pass everything). */
export function hasPermission(session: AuthSession, permission: string): boolean {
  if (session.type !== "user") return false;
  if (session.user.isPlatformAdmin) return true;
  return session.permissions.has(permission);
}

// ── RSC guards (redirect-based) ─────────────────────────────────────────────
export async function requireStaff(
  options: { permission?: string; next?: string } = {},
): Promise<StaffSession> {
  const session = await getSession();

  if (!session || session.type !== "user") {
    const next = options.next ?? "/admin";
    redirect(`/login?as=staff&next=${encodeURIComponent(next)}`);
  }

  if (options.permission && !hasPermission(session, options.permission)) {
    redirect("/admin/forbidden");
  }

  return session;
}

export async function requireCustomer(next = "/account"): Promise<CustomerSession> {
  const session = await getSession();
  if (!session || session.type !== "customer") {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return session;
}

// ── API guards (error-based, translated by withApiErrors) ──────────────────
export async function requireStaffApi(permission?: string): Promise<StaffSession> {
  const session = await getSession();
  if (!session || session.type !== "user") {
    throw new HttpError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  if (permission && !hasPermission(session, permission)) {
    throw new HttpError(403, "FORBIDDEN", "You don't have permission for this action.");
  }
  return session;
}

export async function requireCustomerApi(): Promise<CustomerSession> {
  const session = await getSession();
  if (!session || session.type !== "customer") {
    throw new HttpError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  return session;
}

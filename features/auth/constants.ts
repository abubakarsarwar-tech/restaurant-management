/**
 * Auth domain constants — permissions catalog, role presets, cookie & route
 * contracts. Pure data: safe to import from ANY runtime (edge middleware
 * included — keep this file free of Node/server-only imports).
 */

// ── Cookie configuration ────────────────────────────────────────────────────
export const AUTH_COOKIES = {
  access: "st_access",
  refresh: "st_refresh",
} as const;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

// ── RBAC catalog ────────────────────────────────────────────────────────────
/**
 * The 7 roles of the platform:
 *
 *  SUPER_ADMIN  → users.isPlatformAdmin (flag, SaaS-level, bypasses checks)
 *  OWNER        → all permissions within their restaurant
 *  MANAGER      → everything operational, except staff management
 *  CASHIER      → orders + customers (POS/counter workflow)
 *  KITCHEN      → live order board + catalog read
 *  RIDER        → assigned deliveries: read + advance status
 *  CUSTOMER     → customers table identity; implicit customer:self scope,
 *                 never has backoffice permissions
 */
export const ROLE_KEYS = ["OWNER", "MANAGER", "CASHIER", "KITCHEN", "RIDER"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const PERMISSIONS = [
  "catalog:read",
  "catalog:create",
  "catalog:update",
  "catalog:delete",
  "inventory:manage",
  "orders:read",
  "orders:update",
  "orders:cancel",
  "customers:read",
  "coupons:manage",
  "reviews:moderate",
  "media:manage",
  "analytics:view",
  "settings:update",
  "staff:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Default permission bundle per backoffice role (seeded & overridable). */
export const ROLE_PERMISSION_PRESETS: Record<RoleKey, Permission[]> = {
  OWNER: [...PERMISSIONS],
  MANAGER: PERMISSIONS.filter((p) => p !== "staff:manage"),
  CASHIER: ["orders:read", "orders:update", "catalog:read", "customers:read"],
  KITCHEN: ["orders:read", "orders:update", "catalog:read"],
  RIDER: ["orders:read", "orders:update"],
};

// ── Route protection matrix (consumed by middleware + session guards) ──────
export const PROTECTED_PREFIXES = {
  /** staff identity ("user" token) required */
  staff: ["/admin"],
  /** customer identity required */
  customer: ["/account"],
} as const;

export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
} as const;

/** Where each identity lands after a successful login (no `next` override). */
export function defaultRedirectFor(role: "staff" | "customer"): string {
  return role === "staff" ? "/admin" : "/";
}

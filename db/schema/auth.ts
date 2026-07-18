import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createdOnly, id, timestamps } from "./utils";
import { userStatusEnum } from "./enums";
import { branches, mediaAssets, restaurants } from "./core";

/**
 * ── ACCESS CONTROL DOMAIN (RBAC) ────────────────────────────────────────────
 * Staff/backoffice identity for the SaaS. Customers (storefront shoppers)
 * intentionally live in their OWN domain (customers.ts) — different auth
 * surface, different lifecycle, and guest checkouts never touch this schema.
 *
 *   users ──< user_roles >── roles ──< role_permissions >── permissions
 *                  │
 *                  └─ optional branch scope (NULL = all branches of the
 *                     restaurant that owns the role)
 *
 * Permissions are fine-grained ("orders:update") and global; roles bundle
 * them per-restaurant (or once as system templates, restaurant_id NULL).
 * An auth `sessions` table is deliberately omitted — JWT is stateless (Part 3);
 * if refresh-token / device sessions are needed they get their own table then.
 */

// ── Permissions (global catalog) ────────────────────────────────────────────
export const permissions = pgTable(
  "permissions",
  {
    id: id(),
    // resource:action — "orders:read", "products:create", "analytics:view"
    key: varchar("key", { length: 80 }).notNull(),
    description: text("description"),
    group: varchar("group", { length: 40 }).notNull(), // "orders", "catalog"… for UI grouping
    ...createdOnly, // permission catalog is seeded & append-only
  },
  (t) => [uniqueIndex("permissions_key_uq").on(t.key)],
);

// ── Roles ───────────────────────────────────────────────────────────────────
// restaurant_id NULL = system template ("Owner", "Manager", "Kitchen",
// "Rider") cloned per tenant at onboarding; a restaurant can also define
// fully custom roles.
export const roles = pgTable(
  "roles",
  {
    id: id(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    // Duplicate (NULL restaurant, same name) rows are prevented by seed
    // idempotency; Postgres treats NULLs as distinct in unique indexes.
    uniqueIndex("roles_restaurant_name_uq").on(t.restaurantId, t.name),
    index("roles_restaurant_idx").on(t.restaurantId),
  ],
);

// ── Role ↔ Permission (M:N) ─────────────────────────────────────────────────
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    ...createdOnly,
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index("role_permissions_permission_idx").on(t.permissionId),
  ],
);

// ── Users (staff & admins) ──────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    passwordHash: text("password_hash"), // NULL until invite is accepted
    avatarMediaId: uuid("avatar_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    status: userStatusEnum("status").notNull().default("INVITED"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false), // SaaS super-admin
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [
    // Emails are stored lowercased by the auth layer (Part 3).
    uniqueIndex("users_email_uq").on(t.email),
    index("users_status_idx").on(t.status),
  ],
);

// ── User ↔ Role assignments ────────────────────────────────────────────────
// One user, many roles; one assignment may be pinned to a single branch
// (branch manager) or span the whole restaurant (owner). Surrogate PK +
// index; application layer prevents exact-duplicate assignments.
export const userRoles = pgTable(
  "user_roles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "cascade",
    }), // NULL = all branches of the role's restaurant
    ...createdOnly,
  },
  (t) => [
    index("user_roles_user_idx").on(t.userId),
    index("user_roles_role_idx").on(t.roleId),
    index("user_roles_branch_idx").on(t.branchId),
  ],
);

// ── Auth Sessions (refresh-token rotation) ─────────────────────────────────
// One row per active device session. The refresh JWT carries only { sub, t,
// sid }; its SHA-256 hash lives here, so sessions are revocable per device
// and every refresh rotates (old row revoked) with reuse detection.
// Exactly one of (userId, customerId) — staff or storefront identity.
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id"), // FK declared in customers domain (avoids cycle)
    refreshTokenHash: text("refresh_token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [
    index("auth_sessions_user_idx").on(t.userId),
    index("auth_sessions_customer_idx").on(t.customerId),
    // Sweep/active-session lookups hit only live rows.
    index("auth_sessions_active_idx")
      .on(t.userId, t.expiresAt)
      .where(sql`${t.revokedAt} is null`),
    check(
      "auth_sessions_identity_chk",
      sql`num_nonnulls(${t.userId}, ${t.customerId}) = 1`,
    ),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────
export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [roles.restaurantId],
    references: [restaurants.id],
  }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  avatar: one(mediaAssets, {
    fields: [users.avatarMediaId],
    references: [mediaAssets.id],
  }),
  userRoles: many(userRoles),
  authSessions: many(authSessions),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  branch: one(branches, {
    fields: [userRoles.branchId],
    references: [branches.id],
  }),
}));

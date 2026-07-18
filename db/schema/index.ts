/**
 * Schema barrel — the single import root for Drizzle (and drizzle-kit).
 *
 *   import * as schema from "@/db/schema";
 *   db.query.products.findMany({ with: { variants: true } });
 *
 * File map (domain per file, dependencies point backward only):
 *   enums      → native Postgres enums (append-only — see header comment)
 *   core       → media, restaurants, branches, settings, taxes, hours
 *   auth       → permissions, roles, users, role assignments (RBAC)
 *   customers  → customers, saved addresses
 *   catalog    → categories, tags, ingredients, products, images, variants,
 *                variant options, add-on groups/add-ons, inventory, branches
 *   delivery   → zones, tiered charges
 *   sales      → orders, order items, status events, loyalty ledger
 *   coupons    → coupons, targets, redemptions
 *   payments   → payment attempts, gateway transactions
 *   engagement → reviews, favorites, notifications
 *   content    → banner slides
 *   audit      → audit logs
 */
export * from "./utils";
export * from "./enums";
export * from "./core";
export * from "./auth";
export * from "./customers";
export * from "./catalog";
export * from "./delivery";
export * from "./sales";
export * from "./coupons";
export * from "./payments";
export * from "./engagement";
export * from "./content";
export * from "./audit";

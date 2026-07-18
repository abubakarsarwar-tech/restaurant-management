import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  time,
  date,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createdOnly, id, rateBp, timestamps } from "./utils";

/**
 * ── CORE TENANCY DOMAIN ─────────────────────────────────────────────────────
 * Shared-schema multi-tenancy: `restaurants` is the tenant root; nearly every
 * table in the system carries `restaurant_id` (see the tenancy index policy
 * in docs/DATABASE.md). Branches give a restaurant multiple physical
 * locations with their own hours, zones, inventory and orders, while the
 * catalog stays shared at restaurant level.
 */

// ── Media Library ───────────────────────────────────────────────────────────
// Central asset registry. Every image in the system (product photos, banners,
// logos, avatars) is ONE row here; other tables reference it by FK so assets
// are reusable, auditable and deduplicatable. `restaurant_id` NULL = platform
// asset (stock art the SaaS provides to every tenant).
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: id(),
    // Forward ref to `restaurants` (declared below) — the AnyPgColumn
    // annotation breaks TS mutual-inference recursion on the media↔
    // restaurant FK cycle.
    restaurantId: uuid("restaurant_id").references((): AnyPgColumn => restaurants.id, {
      onDelete: "cascade",
    }),
    provider: varchar("provider", { length: 20 }).notNull().default("cloudinary"),
    publicId: varchar("public_id", { length: 255 }).notNull(), // cloudinary public_id
    secureUrl: text("secure_url").notNull(),
    format: varchar("format", { length: 12 }).notNull().default("webp"),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    folder: varchar("folder", { length: 120 }).notNull().default("general"),
    alt: varchar("alt", { length: 255 }),
    uploadedByUserId: uuid("uploaded_by_user_id"), // FK added in auth domain to avoid cycles
    ...createdOnly, // assets are immutable; replacements are new assets
  },
  (t) => [
    uniqueIndex("media_assets_provider_public_id_uq").on(t.provider, t.publicId),
    index("media_assets_restaurant_idx").on(t.restaurantId),
    index("media_assets_folder_idx").on(t.restaurantId, t.folder),
  ],
);

// ── Restaurants (tenants) ───────────────────────────────────────────────────
export const restaurants = pgTable(
  "restaurants",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    // Globally unique slug — powers tenant subdomains & public URLs.
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    logoMediaId: uuid("logo_media_id").references((): AnyPgColumn => mediaAssets.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("restaurants_slug_uq").on(t.slug),
    index("restaurants_active_idx").on(t.isActive),
  ],
);

// ── Branches ────────────────────────────────────────────────────────────────
// A single-location restaurant simply has exactly one (is_main) branch —
// uniform handling with zero special-casing, and a clean upgrade path the
// day the business opens location #2.
export const branches = pgTable(
  "branches",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    code: varchar("code", { length: 24 }).notNull(), // human ref: "BR-01", "DHA"
    isMain: boolean("is_main").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    addressLine1: varchar("address_line1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line2", { length: 255 }),
    area: varchar("area", { length: 120 }), // neighborhood / district
    city: varchar("city", { length: 120 }).notNull(),
    state: varchar("state", { length: 120 }),
    postalCode: varchar("postal_code", { length: 20 }),
    country: varchar("country", { length: 2 }).notNull().default("US"), // ISO 3166-1 alpha-2
    // numeric(10,7) ≈ 1.1 cm precision — enough for pin-accurate delivery.
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("branches_restaurant_code_uq").on(t.restaurantId, t.code),
    index("branches_restaurant_idx").on(t.restaurantId, t.isActive),
  ],
);

/**
 * ── Restaurant Settings (1:1 with restaurants) ─────────────────────────────
 * One row per tenant — PK IS the restaurant FK, physically enforcing 1:1.
 * Typed columns for anything relational (currency, whatsapp); `jsonb`
 * documents for open-ended nests (theme, social links, ordering rules) so
 * SaaS settings can grow without a migration per new toggle.
 */
export const restaurantSettings = pgTable("restaurant_settings", {
  restaurantId: uuid("restaurant_id")
    .primaryKey()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  tagline: varchar("tagline", { length: 255 }),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  locale: varchar("locale", { length: 10 }).notNull().default("en-US"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  googleMapsUrl: text("google_maps_url"),
  taxInclusivePricing: boolean("tax_inclusive_pricing").notNull().default(false),
  // { primaryColor, secondaryColor, accentColor, radius, defaultDarkMode }
  theme: jsonb("theme")
    .$type<{
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      radius?: "sm" | "md" | "lg";
      defaultDarkMode?: boolean;
    }>()
    .notNull()
    .default({}),
  // { instagram, facebook, tiktok, x, youtube }
  socialLinks: jsonb("social_links")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  // { title, description, keywords, ogImageMediaId }
  seo: jsonb("seo")
    .$type<{
      title?: string;
      description?: string;
      keywords?: string;
      ogImageMediaId?: string;
    }>()
    .notNull()
    .default({}),
  // Ordering rules the storefront & checkout enforce.
  ordering: jsonb("ordering")
    .$type<{
      minOrderCents?: number;
      acceptScheduledOrders?: boolean;
      autoConfirmOrders?: boolean;
      preparationBufferMinutes?: number;
      loyaltyEarnRateBp?: number; // points per currency unit, in bp of a point
      loyaltyRedeemValueCents?: number; // cents per point when redeeming
    }>()
    .notNull()
    .default({}),
  ...timestamps,
});

// ── Tax Rates ───────────────────────────────────────────────────────────────
// Multiple combinable taxes per order (e.g. "GST 17%" + "Service 5%").
// Rate in basis points; breakdown snapshots onto orders at checkout.
export const taxRates = pgTable(
  "tax_rates",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    rateBp: rateBp("rate_bp"), // 17.00% → 1700
    isInclusive: boolean("is_inclusive").notNull().default(false),
    appliesToProducts: boolean("applies_to_products").notNull().default(true),
    appliesToDeliveryFee: boolean("applies_to_delivery_fee").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("tax_rates_restaurant_idx").on(t.restaurantId, t.isActive)],
);

// ── Business Hours (weekly template) ────────────────────────────────────────
// 7 rows per branch (day_of_week 0=Sun..6=Sat); `slot` allows split shifts
// (lunch 11-15 + dinner 18-23 in the same day). Always branch-scoped — even
// single-branch restaurants — so overrides never need NULL semantics.
export const businessHours = pgTable(
  "business_hours",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(), // 0..6
    slot: smallint("slot").notNull().default(1),
    openTime: time("open_time").notNull(),
    closeTime: time("close_time").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("business_hours_branch_day_slot_uq").on(t.branchId, t.dayOfWeek, t.slot),
    check("business_hours_day_chk", sql`${t.dayOfWeek} between 0 and 6`),
    check(
      "business_hours_time_chk",
      sql`${t.isClosed} or ${t.closeTime} <> ${t.openTime}`,
    ),
  ],
);

// ── Holiday / Exception Hours ───────────────────────────────────────────────
// Date-specific overrides that beat the weekly template: full-day closures
// (Eid, Christmas) or exceptional windows (New Year's Eve late close).
export const holidayHours = pgTable(
  "holiday_hours",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    isClosed: boolean("is_closed").notNull().default(true),
    openTime: time("open_time"),
    closeTime: time("close_time"),
    reason: varchar("reason", { length: 160 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("holiday_hours_branch_date_uq").on(t.branchId, t.date),
    check(
      "holiday_hours_window_chk",
      sql`${t.isClosed} or (${t.openTime} is not null and ${t.closeTime} is not null)`,
    ),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────
export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  settings: one(restaurantSettings),
  logo: one(mediaAssets, {
    fields: [restaurants.logoMediaId],
    references: [mediaAssets.id],
  }),
  branches: many(branches),
  taxRates: many(taxRates),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [branches.restaurantId],
    references: [restaurants.id],
  }),
  businessHours: many(businessHours),
  holidayHours: many(holidayHours),
}));

export const restaurantSettingsRelations = relations(restaurantSettings, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantSettings.restaurantId],
    references: [restaurants.id],
  }),
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [taxRates.restaurantId],
    references: [restaurants.id],
  }),
}));

export const businessHoursRelations = relations(businessHours, ({ one }) => ({
  branch: one(branches, {
    fields: [businessHours.branchId],
    references: [branches.id],
  }),
}));

export const holidayHoursRelations = relations(holidayHours, ({ one }) => ({
  branch: one(branches, {
    fields: [holidayHours.branchId],
    references: [branches.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  restaurantsUsingAsLogo: many(restaurants),
}));

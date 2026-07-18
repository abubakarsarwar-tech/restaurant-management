import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  createdOnly,
  id,
  moneyCents,
  moneyCentsNullable,
  softDelete,
  timestamps,
} from "./utils";
import { foodTypeEnum, inventoryMovementTypeEnum, spicyLevelEnum } from "./enums";
import { branches, mediaAssets, restaurants } from "./core";
import { users } from "./auth";

/**
 * ── CATALOG DOMAIN ──────────────────────────────────────────────────────────
 * Shapes the menu: categories → products → variants → add-on groups/add-ons,
 * plus ingredients (allergens + stock recipes), tags, central images and
 * per-branch inventory/availability.
 *
 * Modeling notes (expanded in docs/DATABASE.md):
 *  - Catalog is RESTAURANT-scoped (shared across branches); branches get
 *    availability + price overrides via `branch_products`, and stock lives
 *    per branch in `inventory_levels`.
 *  - "Size" is a first-class purchasable **variant** (own price, SKU,
 *    barcode, default flag). Extra descriptive axes (Color…) hang off
 *    `variant_options` as key/value rows — normalized enough to index,
 *    flexible enough to avoid a combinatorial option-matrix schema.
 *  - Orders never read these rows directly at purchase time — they snapshot
 *    names/prices (see sales.ts) so catalog edits can't rewrite history.
 */

// ── Categories (nested, one level of recursion via parent) ─────────────────
export const categories = pgTable(
  "categories",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }), // NULL = top-level ("Burgers" → child "Chicken Burgers")
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    imageMediaId: uuid("image_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("categories_restaurant_slug_uq").on(t.restaurantId, t.slug),
    index("categories_parent_idx").on(t.parentId),
    index("categories_restaurant_active_idx").on(t.restaurantId, t.isActive, t.sortOrder),
  ],
);

// ── Tags (filter/facet labels: "Bestseller", "Chef's Pick", halal cert…) ────
export const tags = pgTable(
  "tags",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("tags_restaurant_slug_uq").on(t.restaurantId, t.slug)],
);

// ── Ingredients (allergens + build-of-materials for stock deduction) ────────
export const ingredients = pgTable(
  "ingredients",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    isAllergen: boolean("is_allergen").notNull().default(false),
    unit: varchar("unit", { length: 16 }).notNull().default("g"), // g / ml / pcs
    ...timestamps,
  },
  (t) => [uniqueIndex("ingredients_restaurant_name_uq").on(t.restaurantId, t.name)],
);

// ── Products ────────────────────────────────────────────────────────────────
// All merchandising flags + kitchen metadata + SEO + availability schedule.
// `base_price_cents` is the default entry price (or the only price for
// variant-less products); concrete purchasable SKUs live in variants.
export const products = pgTable(
  "products",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    shortDescription: varchar("short_description", { length: 255 }),

    // Identity & pricing (money = integer cents)
    sku: varchar("sku", { length: 64 }),
    barcode: varchar("barcode", { length: 64 }),
    basePriceCents: moneyCents("base_price_cents"),
    compareAtPriceCents: moneyCentsNullable("compare_at_price_cents"), // strikethrough "was"
    costCents: moneyCentsNullable("cost_cents"), // COGS for margin reports

    // Dietary & kitchen metadata
    foodType: foodTypeEnum("food_type").notNull().default("NON_VEGETARIAN"),
    spicyLevel: spicyLevelEnum("spicy_level").notNull().default("NONE"),
    prepTimeMinutes: integer("prep_time_minutes"), // kitchen ETA input
    calories: integer("calories"),
    servingInfo: varchar("serving_info", { length: 80 }), // "Serves 2–3"

    // Merchandising flags (popularity_score powers the "Popular" rail so it
    // can be recomputed from sales; the boolean is the manual override)
    isFeatured: boolean("is_featured").notNull().default(false),
    isTrending: boolean("is_trending").notNull().default(false),
    isPopular: boolean("is_popular").notNull().default(false),
    popularityScore: integer("popularity_score").notNull().default(0),

    // Availability: master switch + optional weekly time window
    isActive: boolean("is_active").notNull().default(true), // in menu at all
    isAvailable: boolean("is_available").notNull().default(true), // sell today
    trackInventory: boolean("track_inventory").notNull().default(false),
    availableDays: smallint("available_days")
      .array()
      .notNull()
      .default(sql`'{0,1,2,3,4,5,6}'::int2[]`),
    availableFrom: time("available_from"), // NULL window = all day
    availableTo: time("available_to"),

    // Menu presentation
    sortOrder: integer("sort_order").notNull().default(0), // manual ordering within category

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("products_restaurant_slug_uq").on(t.restaurantId, t.slug),
    uniqueIndex("products_restaurant_sku_uq")
      .on(t.restaurantId, t.sku)
      .where(sql`${t.sku} is not null`),
    index("products_category_idx").on(t.categoryId, t.sortOrder),
    // Storefront hot path: menu lists filter by restaurant + active flags.
    index("products_storefront_idx").on(
      t.restaurantId,
      t.isActive,
      t.isAvailable,
      t.categoryId,
    ),
    index("products_featured_idx").on(t.restaurantId, t.isFeatured),
    // Popularity rail: score-sorted reads
    index("products_popularity_idx").on(t.restaurantId, t.popularityScore),
    check("products_price_chk", sql`${t.basePriceCents} >= 0`),
    check("products_days_chk", sql`${t.availableDays} <@ '{0,1,2,3,4,5,6}'::int2[]`),
  ],
);

// ── Product Images (M:N with media library, ordered) ───────────────────────
export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...createdOnly,
  },
  (t) => [
    uniqueIndex("product_images_product_media_uq").on(t.productId, t.mediaId),
    index("product_images_product_idx").on(t.productId, t.sortOrder),
    // Guaranteed single hero image per product at the DB level:
    uniqueIndex("product_images_primary_uq")
      .on(t.productId)
      .where(sql`${t.isPrimary}`),
  ],
);

// ── Product ↔ Ingredient (recipe/BOM) ───────────────────────────────────────
export const productIngredients = pgTable(
  "product_ingredients",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 10, scale: 3 }), // per serving, in ingredient.unit
    isRemovable: boolean("is_removable").notNull().default(false), // "no onions" allowed
    ...createdOnly,
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.ingredientId] }),
    index("product_ingredients_ingredient_idx").on(t.ingredientId),
  ],
);

// ── Product ↔ Tag (M:N) ─────────────────────────────────────────────────────
export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    ...createdOnly,
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.tagId] }),
    index("product_tags_tag_idx").on(t.tagId),
  ],
);

// ── Product Variants (purchasable SKUs: sizes → prices) ────────────────────
// A product with variants sells VARIANTS, not the base row (base price shown
// as "from"). First variant flagged default is preselected on the PDP.
export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(), // "Large 12\"", "Family Deal"
    sku: varchar("sku", { length: 64 }),
    barcode: varchar("barcode", { length: 64 }),
    priceCents: moneyCents("price_cents"),
    compareAtPriceCents: moneyCentsNullable("compare_at_price_cents"),
    costCents: moneyCentsNullable("cost_cents"),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId, t.sortOrder),
    uniqueIndex("product_variants_sku_uq")
      .on(t.sku)
      .where(sql`${t.sku} is not null`),
    uniqueIndex("product_variants_default_uq")
      .on(t.productId)
      .where(sql`${t.isDefault}`),
    check("product_variants_price_chk", sql`${t.priceCents} >= 0`),
  ],
);

// ── Variant Options (attribute axes: Size→Large, Color→Red) ────────────────
// Lightweight attribute rows per variant — supports "colors (optional)" and
// any future axis without a rigid option-matrix schema.
export const variantOptions = pgTable(
  "variant_options",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    group: varchar("group", { length: 60 }).notNull(), // "Size" | "Color"
    value: varchar("value", { length: 120 }).notNull(), // "Large" | "Red"
    position: integer("position").notNull().default(0),
    ...createdOnly,
  },
  (t) => [
    index("variant_options_variant_idx").on(t.variantId),
    uniqueIndex("variant_options_variant_group_uq").on(t.variantId, t.group),
  ],
);

// ── Add-on Groups (per product) ─────────────────────────────────────────────
// "Extra Toppings" (pick up to 5), "Choose your dip" (required, exactly 1)…
export const addonGroups = pgTable(
  "addon_groups",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    minSelections: integer("min_selections").notNull().default(0),
    maxSelections: integer("max_selections"), // NULL = unlimited
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("addon_groups_product_idx").on(t.productId, t.sortOrder),
    check(
      "addon_groups_range_chk",
      sql`${t.minSelections} >= 0 and (${t.maxSelections} is null or ${t.maxSelections} >= ${t.minSelections})`,
    ),
  ],
);

// ── Add-ons (extra toppings / choices inside a group) ───────────────────────
export const addons = pgTable(
  "addons",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => addonGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(), // "Extra cheese"
    priceCents: moneyCents("price_cents"),
    maxQuantity: integer("max_quantity").notNull().default(1), // allow 2× cheese
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("addons_group_idx").on(t.groupId, t.sortOrder),
    check("addons_price_chk", sql`${t.priceCents} >= 0`),
  ],
);

// ── Inventory Levels (current stock, per branch) ───────────────────────────
// variant_id NULL ⇒ stock tracked at product level (variant-less products).
// One row per (branch, product[, variant]) — the fast read path the POS and
// storefront hit; every change is journaled in inventory_movements.
export const inventoryLevels = pgTable(
  "inventory_levels",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0), // in open orders
    lowStockThreshold: integer("low_stock_threshold"), // triggers STOCK_ALERT
    ...timestamps,
  },
  (t) => [
    index("inventory_levels_branch_idx").on(t.branchId, t.productId),
    index("inventory_levels_variant_idx").on(t.variantId),
    check(
      "inventory_levels_qty_chk",
      sql`${t.quantity} >= 0 and ${t.reservedQuantity} >= 0`,
    ),
  ],
);

// ── Inventory Movements (append-only ledger) ───────────────────────────────
// WHY a ledger AND a levels table: levels give O(1) reads; the ledger
// explains every change (who/when/why/which order) — the difference between
// "stock says 4" and "stock says 4 because a 7-item order + a 3-count waste
// entry happened since the last purchase of 14". Auditable = trustworthy.
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(), // signed
    reference: varchar("reference", { length: 120 }), // order #, PO #…
    note: text("note"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...createdOnly,
  },
  (t) => [
    index("inventory_movements_branch_created_idx").on(t.branchId, t.createdAt),
    index("inventory_movements_product_idx").on(t.productId, t.createdAt),
  ],
);

// ── Branch Products (availability + price overrides per location) ───────────
// A row says: "this branch sells it (or not), possibly at its own price".
// Absence of a row = inherit catalog defaults & available at this branch.
export const branchProducts = pgTable(
  "branch_products",
  {
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").notNull().default(true),
    priceOverrideCents: moneyCentsNullable("price_override_cents"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.branchId, t.productId] }),
    index("branch_products_product_idx").on(t.productId),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_hierarchy",
  }),
  children: many(categories, { relationName: "category_hierarchy" }),
  image: one(mediaAssets, {
    fields: [categories.imageMediaId],
    references: [mediaAssets.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  addonGroups: many(addonGroups),
  ingredients: many(productIngredients),
  tags: many(productTags),
  inventoryLevels: many(inventoryLevels),
  branchOverrides: many(branchProducts),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  media: one(mediaAssets, {
    fields: [productImages.mediaId],
    references: [mediaAssets.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  options: many(variantOptions),
}));

export const variantOptionsRelations = relations(variantOptions, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantOptions.variantId],
    references: [productVariants.id],
  }),
}));

export const addonGroupsRelations = relations(addonGroups, ({ one, many }) => ({
  product: one(products, {
    fields: [addonGroups.productId],
    references: [products.id],
  }),
  addons: many(addons),
}));

export const addonsRelations = relations(addons, ({ one }) => ({
  group: one(addonGroups, {
    fields: [addons.groupId],
    references: [addonGroups.id],
  }),
}));

export const inventoryLevelsRelations = relations(inventoryLevels, ({ one }) => ({
  branch: one(branches, {
    fields: [inventoryLevels.branchId],
    references: [branches.id],
  }),
  product: one(products, {
    fields: [inventoryLevels.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventoryLevels.variantId],
    references: [productVariants.id],
  }),
}));

export const branchProductsRelations = relations(branchProducts, ({ one }) => ({
  branch: one(branches, {
    fields: [branchProducts.branchId],
    references: [branches.id],
  }),
  product: one(products, {
    fields: [branchProducts.productId],
    references: [products.id],
  }),
}));

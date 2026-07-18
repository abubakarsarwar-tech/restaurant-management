import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "./utils";
import { branches, mediaAssets, restaurants } from "./core";
import { categories, products } from "./catalog";

/**
 * ── CONTENT / MARKETING DOMAIN ──────────────────────────────────────────────
 * Storefront hero carousel slides. (Media assets themselves live in core.ts
 * as the shared media library.)
 */

export const bannerSlides = pgTable(
  "banner_slides",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    // NULL = shown for every branch; set = branch-local campaign
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 160 }).notNull(),
    subtitle: varchar("subtitle", { length: 255 }),
    imageMediaId: uuid("image_media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    // CTA: free-form URL, or a deep link to a product/category page
    ctaLabel: varchar("cta_label", { length: 60 }),
    ctaUrl: text("cta_url"),
    linkedProductId: uuid("linked_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    linkedCategoryId: uuid("linked_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    // Campaign window (NULL = always)
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [
    index("banner_slides_storefront_idx").on(t.restaurantId, t.isActive, t.sortOrder),
  ],
);

export const bannerSlidesRelations = relations(bannerSlides, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [bannerSlides.restaurantId],
    references: [restaurants.id],
  }),
  image: one(mediaAssets, {
    fields: [bannerSlides.imageMediaId],
    references: [mediaAssets.id],
  }),
  linkedProduct: one(products, {
    fields: [bannerSlides.linkedProductId],
    references: [products.id],
  }),
  linkedCategory: one(categories, {
    fields: [bannerSlides.linkedCategoryId],
    references: [categories.id],
  }),
}));

import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  addonGroups,
  addons,
  branches,
  categories,
  inventoryLevels,
  mediaAssets,
  productImages,
  products,
  productTags,
  productVariants,
  tags,
  variantOptions,
} from "@/db/schema";

import type {
  BranchOption,
  CategoryOption,
  ProductEditorData,
  ProductListRow,
  TagOption,
} from "../types";
import type { ProductListQuery } from "../schemas";
import type { ProductStatusFilter } from "../constants";

/**
 * Catalog read models — admin product list/editor. Reads stay plain &
 * composable; heavy page assembly (images, counts, stock) happens in a
 * second batched step instead of N+1s or monster joins.
 */

function statusFilter(status: ProductStatusFilter): SQL | undefined {
  switch (status) {
    case "active":
      return eq(products.isActive, true);
    case "inactive":
      return eq(products.isActive, false);
    case "available":
      return eq(products.isAvailable, true);
    case "unavailable":
      return eq(products.isAvailable, false);
    case "featured":
      return eq(products.isFeatured, true);
    case "trending":
      return eq(products.isTrending, true);
    case "popular":
      return eq(products.isPopular, true);
    default:
      return undefined;
  }
}

function orderByFor(sort: ProductListQuery["sort"]): SQL[] {
  switch (sort) {
    case "name_asc":
      return [asc(products.name)];
    case "name_desc":
      return [desc(products.name)];
    case "price_asc":
      return [asc(products.basePriceCents)];
    case "price_desc":
      return [desc(products.basePriceCents)];
    case "created_desc":
      return [desc(products.createdAt)];
    case "sort_asc":
      return [asc(products.sortOrder), asc(products.name)];
    default:
      return [desc(products.updatedAt)];
  }
}

export type ProductListResult = {
  rows: ProductListRow[];
  total: number;
};

export async function listProducts(
  restaurantId: string,
  query: ProductListQuery,
): Promise<ProductListResult> {
  const filters: SQL[] = [
    eq(products.restaurantId, restaurantId),
    isNull(products.deletedAt),
  ];

  if (query.q) {
    const pattern = `%${query.q}%`;
    filters.push(or(ilike(products.name, pattern), ilike(products.sku, pattern))!);
  }
  if (query.categoryId) filters.push(eq(products.categoryId, query.categoryId));
  if (query.foodType) filters.push(eq(products.foodType, query.foodType));
  const status = statusFilter(query.status);
  if (status) filters.push(status);

  // low_stock joins the levels aggregate — applied AFTER page fetch below.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .where(and(...filters));

  const pageRows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      categoryName: categories.name,
      basePriceCents: products.basePriceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      foodType: products.foodType,
      spicyLevel: products.spicyLevel,
      isActive: products.isActive,
      isAvailable: products.isAvailable,
      isFeatured: products.isFeatured,
      isTrending: products.isTrending,
      isPopular: products.isPopular,
      trackInventory: products.trackInventory,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(...orderByFor(query.sort))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  if (pageRows.length === 0) return { rows: [], total: count };

  const ids = pageRows.map((r) => r.id);

  // Batch the per-row decorations (image, variant count. stock) — 3 queries
  // total regardless of page size.
  const [images, variantCounts, stockRows] = await Promise.all([
    db
      .select({
        productId: productImages.productId,
        url: mediaAssets.secureUrl,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(
        and(inArray(productImages.productId, ids), eq(productImages.isPrimary, true)),
      ),
    db
      .select({
        productId: productVariants.productId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, ids))
      .groupBy(productVariants.productId),
    db
      .select({
        productId: inventoryLevels.productId,
        total: sql<number>`coalesce(sum(${inventoryLevels.quantity}), 0)`.mapWith(Number),
        low: sql<boolean>`bool_or(${inventoryLevels.lowStockThreshold} is not null and ${inventoryLevels.quantity} <= ${inventoryLevels.lowStockThreshold})`,
      })
      .from(inventoryLevels)
      .where(inArray(inventoryLevels.productId, ids))
      .groupBy(inventoryLevels.productId),
  ]);

  const imageBy = new Map(images.map((r) => [r.productId, r.url]));
  const variantsBy = new Map(variantCounts.map((r) => [r.productId, r.count]));
  const stockBy = new Map(stockRows.map((r) => [r.productId, r]));

  const rows: ProductListRow[] = pageRows.map((row) => {
    const stock = stockBy.get(row.id);
    return {
      ...row,
      imageUrl: imageBy.get(row.id) ?? null,
      variantCount: variantsBy.get(row.id) ?? 0,
      stockOnHand: row.trackInventory ? (stock?.total ?? 0) : null,
      lowStock: row.trackInventory ? (stock?.low ?? false) : false,
    };
  });

  // "Low stock" is a computed decoration — filter & fix counts after the fact.
  if (query.status === "low_stock") {
    const tracked = rows.filter((r) => r.lowStock);
    return { rows: tracked, total: tracked.length };
  }

  return { rows, total: count };
}

// ── Editor payload ──────────────────────────────────────────────────────────
export async function getProductEditor(
  restaurantId: string,
  productId: string,
): Promise<ProductEditorData | null> {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.restaurantId, restaurantId),
        isNull(products.deletedAt),
      ),
    )
    .limit(1);

  if (!product) return null;

  const [imageRows, variantRows, groupRows, tagRows, levelRows] = await Promise.all([
    db
      .select({
        mediaId: productImages.mediaId,
        url: mediaAssets.secureUrl,
        alt: mediaAssets.alt,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.sortOrder)),
    db
      .select()
      .from(addonGroups)
      .where(eq(addonGroups.productId, productId))
      .orderBy(asc(addonGroups.sortOrder)),
    db
      .select({ name: tags.name })
      .from(productTags)
      .innerJoin(tags, eq(productTags.tagId, tags.id))
      .where(eq(productTags.productId, productId))
      .orderBy(asc(tags.name)),
    db
      .select({
        branchId: inventoryLevels.branchId,
        branchName: branches.name,
        variantId: inventoryLevels.variantId,
        quantity: inventoryLevels.quantity,
        reservedQuantity: inventoryLevels.reservedQuantity,
        lowStockThreshold: inventoryLevels.lowStockThreshold,
      })
      .from(inventoryLevels)
      .innerJoin(branches, eq(inventoryLevels.branchId, branches.id))
      .where(eq(inventoryLevels.productId, productId)),
  ]);

  const [optionRows, addonRows] = await Promise.all([
    variantRows.length
      ? db
          .select()
          .from(variantOptions)
          .where(
            inArray(
              variantOptions.variantId,
              variantRows.map((v) => v.id),
            ),
          )
      : Promise.resolve([]),
    groupRows.length
      ? db
          .select()
          .from(addons)
          .where(
            inArray(
              addons.groupId,
              groupRows.map((g) => g.id),
            ),
          )
          .orderBy(asc(addons.sortOrder))
      : Promise.resolve([]),
  ]);

  const variantName = new Map(variantRows.map((v) => [v.id, v.name]));

  return {
    id: product.id,
    restaurantId: product.restaurantId,
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    basePriceCents: product.basePriceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    costCents: product.costCents,
    foodType: product.foodType,
    spicyLevel: product.spicyLevel,
    prepTimeMinutes: product.prepTimeMinutes,
    calories: product.calories,
    servingInfo: product.servingInfo,
    isActive: product.isActive,
    isAvailable: product.isAvailable,
    trackInventory: product.trackInventory,
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isPopular: product.isPopular,
    availableDays: product.availableDays,
    availableFrom: product.availableFrom,
    availableTo: product.availableTo,
    sortOrder: product.sortOrder,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: imageRows,
    tags: tagRows.map((t) => t.name),
    variants: variantRows.map((v) => {
      const option = optionRows.find((o) => o.variantId === v.id);
      return {
        id: v.id,
        name: v.name,
        optionGroup: option?.group ?? null,
        optionValue: option?.value ?? null,
        sku: v.sku,
        barcode: v.barcode,
        priceCents: v.priceCents,
        compareAtPriceCents: v.compareAtPriceCents,
        costCents: v.costCents,
        isDefault: v.isDefault,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      };
    }),
    addonGroups: groupRows.map((g) => ({
      id: g.id,
      name: g.name,
      isRequired: g.isRequired,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      sortOrder: g.sortOrder,
      addons: addonRows
        .filter((a) => a.groupId === g.id)
        .map((a) => ({
          id: a.id,
          name: a.name,
          priceCents: a.priceCents,
          maxQuantity: a.maxQuantity,
          isActive: a.isActive,
          sortOrder: a.sortOrder,
        })),
    })),
    inventory: levelRows.map((l) => ({
      ...l,
      variantName: l.variantId ? (variantName.get(l.variantId) ?? null) : null,
    })),
  };
}

// ── Form metadata (selects) ─────────────────────────────────────────────────
export type ProductFormMeta = {
  categories: CategoryOption[];
  tags: TagOption[];
  branches: BranchOption[];
};

export async function getProductFormMeta(restaurantId: string): Promise<ProductFormMeta> {
  const [categoryRows, tagRows, branchRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
      .from(categories)
      .where(
        and(
          eq(categories.restaurantId, restaurantId),
          eq(categories.isActive, true),
          isNull(categories.deletedAt),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(eq(tags.restaurantId, restaurantId))
      .orderBy(asc(tags.name)),
    db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        isMain: branches.isMain,
      })
      .from(branches)
      .where(and(eq(branches.restaurantId, restaurantId), eq(branches.isActive, true)))
      .orderBy(desc(branches.isMain), asc(branches.name)),
  ]);

  return { categories: categoryRows, tags: tagRows, branches: branchRows };
}

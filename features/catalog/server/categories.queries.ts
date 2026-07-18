import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, mediaAssets, products } from "@/db/schema";

import type { CategoryListRow } from "../types";

/**
 * Category read model for the admin grid — one query with aggregate
 * subselects (product & child counts) instead of N+1 lookups.
 */
export async function listCategories(restaurantId: string): Promise<CategoryListRow[]> {
  const productCount = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .where(and(eq(products.categoryId, categories.id), isNull(products.deletedAt)));

  const childCount = db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(sql`categories child`)
    .where(and(sql`child.parent_id = ${categories.id}`, sql`child.deleted_at is null`));

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      description: categories.description,
      imageMediaId: categories.imageMediaId,
      bannerMediaId: categories.bannerMediaId,
      imageUrl: mediaAssets.secureUrl,
      icon: categories.icon,
      colorTheme: categories.colorTheme,
      isEditorsChoice: categories.isEditorsChoice,
      isActive: categories.isActive,
      sortOrder: categories.sortOrder,
      productCount: sql<number>`(${productCount})`.mapWith(Number),
      childCount: sql<number>`(${childCount})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(mediaAssets, eq(categories.imageMediaId, mediaAssets.id))
    .where(and(eq(categories.restaurantId, restaurantId), isNull(categories.deletedAt)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // Banner urls come from a second pass — only for rows that actually have one.
  const bannerIds = rows.map((r) => r.id);
  const bannerMap = new Map<string, string>();
  if (bannerIds.length) {
    const banners = await db
      .select({ id: categories.id, url: mediaAssets.secureUrl })
      .from(categories)
      .innerJoin(mediaAssets, eq(categories.bannerMediaId, mediaAssets.id))
      .where(
        and(
          eq(categories.restaurantId, restaurantId),
          sql`${categories.bannerMediaId} is not null`,
        ),
      );
    for (const b of banners) if (b.url) bannerMap.set(b.id, b.url);
  }

  const nameBy = new Map(rows.map((r) => [r.id, r.name]));

  return rows.map((row) => ({
    ...row,
    parentName: row.parentId ? (nameBy.get(row.parentId) ?? null) : null,
    bannerUrl: bannerMap.get(row.id) ?? null,
  }));
}

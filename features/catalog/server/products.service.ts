import "server-only";

import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  addonGroups,
  addons,
  branches,
  categories,
  inventoryLevels,
  inventoryMovements,
  productImages,
  products,
  productTags,
  productVariants,
  tags,
  variantOptions,
} from "@/db/schema";
import { HttpError } from "@/lib/api";
import { slugify } from "@/utils/slugify";
import { toCsv } from "@/utils/csv";
import { writeAudit } from "@/lib/audit";

import { PRODUCT_CSV_COLUMNS } from "../constants";
import { blankToNull } from "../schemas";
import type {
  ProductBulkAction,
  ProductImportRow,
  ProductUpsertInput,
  StockAdjustInput,
} from "../schemas";

/**
 * Product mutations — every write runs in a transaction, journals an audit
 * entry, and keeps the child collections (images/variants/add-ons/tags)
 * consistent with replace-by-diff semantics.
 */

const toCents = (major: number): number => Math.round(major * 100);
const centsOrNull = (major: number | null | undefined): number | null =>
  major == null ? null : toCents(major);

// ── Slug uniqueness ─────────────────────────────────────────────────────────
async function uniqueProductSlug(
  restaurantId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "product";
  const existing = await db
    .select({ slug: products.slug })
    .from(products)
    .where(
      and(
        eq(products.restaurantId, restaurantId),
        excludeId ? ne(products.id, excludeId) : undefined,
        sql`${products.slug} ~ ${`^${root}(-\\d+)?$`}`,
      ),
    );
  if (!excludeId && existing.length === 0) return root;
  if (excludeId && !existing.some((r) => r.slug === root)) return root;

  let suffix = 2;
  const taken = new Set(existing.map((r) => r.slug));
  while (taken.has(`${root}-${suffix}`)) suffix++;
  return `${root}-${suffix}`;
}

// ── Tag resolution (names → ids, creating on first use) ─────────────────────
async function resolveTagIds(
  tx: Tx,
  restaurantId: string,
  names: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name);
    const [existing] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.restaurantId, restaurantId), eq(tags.slug, slug)))
      .limit(1);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const [created] = await tx
      .insert(tags)
      .values({ restaurantId, name, slug })
      .returning({ id: tags.id });
    ids.push(created!.id);
  }
  return ids;
}

// ── Child collection syncs ──────────────────────────────────────────────────
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function syncImages(
  tx: Tx,
  productId: string,
  images: ProductUpsertInput["images"],
) {
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length === 0) return;

  const hasPrimary = images.some((i) => i.isPrimary);
  await tx.insert(productImages).values(
    images.map((image, index) => ({
      productId,
      mediaId: image.mediaId,
      isPrimary: hasPrimary ? image.isPrimary : index === 0,
      sortOrder: index,
    })),
  );
}

async function syncVariants(
  tx: Tx,
  productId: string,
  variants: ProductUpsertInput["variants"],
) {
  const existing = await tx
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  const keepIds = new Set(variants.map((v) => v.id).filter(Boolean));
  const removeIds = existing.map((v) => v.id).filter((id) => !keepIds.has(id));
  if (removeIds.length) {
    await tx.delete(productVariants).where(inArray(productVariants.id, removeIds));
  }

  // Guarantee exactly one default whenever variants exist.
  const defaultIndex = variants.findIndex((v) => v.isDefault);
  const resolvedDefault = defaultIndex >= 0 ? defaultIndex : variants.length ? 0 : -1;

  for (const [index, variant] of variants.entries()) {
    const isDefault = index === resolvedDefault;
    const values = {
      productId,
      name: variant.name,
      sku: blankToNull(variant.sku),
      barcode: blankToNull(variant.barcode),
      priceCents: toCents(variant.price),
      compareAtPriceCents: centsOrNull(variant.compareAtPrice),
      costCents: centsOrNull(variant.cost),
      isDefault,
      isActive: variant.isActive,
      sortOrder: index,
    };

    let variantId = variant.id;
    if (variantId) {
      await tx
        .update(productVariants)
        .set(values)
        .where(eq(productVariants.id, variantId));
    } else {
      const [inserted] = await tx
        .insert(productVariants)
        .values(values)
        .returning({ id: productVariants.id });
      variantId = inserted!.id;
    }

    // Options: one row per (variant, group) — absorb into a single upsert.
    await tx.delete(variantOptions).where(eq(variantOptions.variantId, variantId));
    if (variant.option && variant.option.value) {
      await tx.insert(variantOptions).values({
        variantId,
        group: variant.option.group,
        value: variant.option.value,
        position: 0,
      });
    }
  }
}

async function syncAddonGroups(
  tx: Tx,
  productId: string,
  groups: ProductUpsertInput["addonGroups"],
) {
  const existing = await tx
    .select({ id: addonGroups.id })
    .from(addonGroups)
    .where(eq(addonGroups.productId, productId));
  const keepIds = new Set(groups.map((g) => g.id).filter(Boolean));
  const removeIds = existing.map((g) => g.id).filter((id) => !keepIds.has(id));
  if (removeIds.length) {
    await tx.delete(addonGroups).where(inArray(addonGroups.id, removeIds));
  }

  for (const [index, group] of groups.entries()) {
    const values = {
      productId,
      name: group.name,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections ?? null,
      sortOrder: index,
    };

    let groupId = group.id;
    if (groupId) {
      await tx.update(addonGroups).set(values).where(eq(addonGroups.id, groupId));
    } else {
      const [inserted] = await tx
        .insert(addonGroups)
        .values(values)
        .returning({ id: addonGroups.id });
      groupId = inserted!.id;
    }

    const existingAddons = await tx
      .select({ id: addons.id })
      .from(addons)
      .where(eq(addons.groupId, groupId));
    const keepAddonIds = new Set(group.addons.map((a) => a.id).filter(Boolean));
    const removeAddonIds = existingAddons
      .map((a) => a.id)
      .filter((id) => !keepAddonIds.has(id));
    if (removeAddonIds.length) {
      await tx.delete(addons).where(inArray(addons.id, removeAddonIds));
    }

    for (const [addonIndex, addon] of group.addons.entries()) {
      const addonValues = {
        groupId,
        name: addon.name,
        priceCents: toCents(addon.price),
        maxQuantity: addon.maxQuantity,
        isActive: addon.isActive,
        sortOrder: addonIndex,
      };
      if (addon.id) {
        await tx.update(addons).set(addonValues).where(eq(addons.id, addon.id));
      } else {
        await tx.insert(addons).values(addonValues);
      }
    }
  }
}

async function syncTags(
  tx: Tx,
  restaurantId: string,
  productId: string,
  names: string[],
) {
  await tx.delete(productTags).where(eq(productTags.productId, productId));
  const ids = await resolveTagIds(tx, restaurantId, names);
  if (ids.length) {
    await tx.insert(productTags).values(ids.map((tagId) => ({ productId, tagId })));
  }
}

// ── Guard: product belongs to caller's restaurant ───────────────────────────
async function assertProductOwnership(restaurantId: string, productId: string) {
  const [row] = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.restaurantId, restaurantId),
        isNull(products.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Product not found.");
  return row;
}

/** Translate Postgres unique violations into friendly 409s. */
function rethrowPg(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("products_restaurant_sku_uq")) {
    throw new HttpError(409, "CONFLICT", "Another product already uses this SKU.");
  }
  if (message.includes("product_variants_sku_uq")) {
    throw new HttpError(409, "CONFLICT", "Another variant already uses this SKU.");
  }
  if (message.includes("products_restaurant_slug_uq")) {
    throw new HttpError(409, "CONFLICT", "Another product already uses this slug.");
  }
  throw error;
}

// ── Create / update ─────────────────────────────────────────────────────────
export async function createProduct(
  restaurantId: string,
  actorUserId: string,
  input: ProductUpsertInput,
): Promise<{ id: string }> {
  const slug = await uniqueProductSlug(restaurantId, input.slug || input.name);

  // Resolve main branch up-front for the optional opening-stock journal.
  const [mainBranch] = input.trackInventory
    ? await db
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.restaurantId, restaurantId),
            eq(branches.isMain, true),
            eq(branches.isActive, true),
          ),
        )
        .limit(1)
    : [];

  try {
    const productId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          restaurantId,
          categoryId: input.categoryId,
          name: input.name,
          slug,
          shortDescription: blankToNull(input.shortDescription),
          description: blankToNull(input.description),
          sku: blankToNull(input.sku),
          barcode: blankToNull(input.barcode),
          basePriceCents: toCents(input.basePrice),
          compareAtPriceCents: centsOrNull(input.compareAtPrice),
          costCents: centsOrNull(input.cost),
          foodType: input.foodType,
          spicyLevel: input.spicyLevel,
          prepTimeMinutes: input.prepTimeMinutes,
          calories: input.calories,
          servingInfo: blankToNull(input.servingInfo),
          isActive: input.isActive,
          isAvailable: input.isAvailable,
          trackInventory: input.trackInventory,
          isFeatured: input.isFeatured,
          isTrending: input.isTrending,
          isPopular: input.isPopular,
          availableDays: input.availableDays,
          availableFrom: blankToNull(input.availableFrom),
          availableTo: blankToNull(input.availableTo),
          sortOrder: input.sortOrder,
          seoTitle: blankToNull(input.seoTitle),
          seoDescription: blankToNull(input.seoDescription),
        })
        .returning({ id: products.id });

      const id = created!.id;
      await syncImages(tx, id, input.images);
      await syncVariants(tx, id, input.variants);
      await syncAddonGroups(tx, id, input.addonGroups);
      await syncTags(tx, restaurantId, id, input.tags);

      // Opening stock at the main branch (journal + level, ledger-consistent).
      if (
        input.trackInventory &&
        input.initialStock &&
        input.initialStock.quantity > 0 &&
        mainBranch
      ) {
        await tx.insert(inventoryLevels).values({
          branchId: mainBranch.id,
          productId: id,
          quantity: input.initialStock.quantity,
          lowStockThreshold: input.initialStock.lowStockThreshold ?? null,
        });
        await tx.insert(inventoryMovements).values({
          branchId: mainBranch.id,
          productId: id,
          type: "PURCHASE",
          quantityDelta: input.initialStock.quantity,
          reference: slug,
          note: "Opening stock",
          createdByUserId: actorUserId,
        });
      }

      return id;
    });

    await writeAudit({
      restaurantId,
      actorUserId,
      action: "products.create",
      entityType: "product",
      entityId: productId,
      changes: { after: { name: input.name, slug } },
    });

    return { id: productId };
  } catch (error) {
    rethrowPg(error);
  }
}

export async function updateProduct(
  restaurantId: string,
  actorUserId: string,
  productId: string,
  input: ProductUpsertInput,
): Promise<void> {
  const existing = await assertProductOwnership(restaurantId, productId);
  const slug = await uniqueProductSlug(restaurantId, input.slug || input.name, productId);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          categoryId: input.categoryId,
          name: input.name,
          slug,
          shortDescription: blankToNull(input.shortDescription),
          description: blankToNull(input.description),
          sku: blankToNull(input.sku),
          barcode: blankToNull(input.barcode),
          basePriceCents: toCents(input.basePrice),
          compareAtPriceCents: centsOrNull(input.compareAtPrice),
          costCents: centsOrNull(input.cost),
          foodType: input.foodType,
          spicyLevel: input.spicyLevel,
          prepTimeMinutes: input.prepTimeMinutes,
          calories: input.calories,
          servingInfo: blankToNull(input.servingInfo),
          isActive: input.isActive,
          isAvailable: input.isAvailable,
          trackInventory: input.trackInventory,
          isFeatured: input.isFeatured,
          isTrending: input.isTrending,
          isPopular: input.isPopular,
          availableDays: input.availableDays,
          availableFrom: blankToNull(input.availableFrom),
          availableTo: blankToNull(input.availableTo),
          sortOrder: input.sortOrder,
          seoTitle: blankToNull(input.seoTitle),
          seoDescription: blankToNull(input.seoDescription),
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      await syncImages(tx, productId, input.images);
      await syncVariants(tx, productId, input.variants);
      await syncAddonGroups(tx, productId, input.addonGroups);
      await syncTags(tx, restaurantId, productId, input.tags);
    });

    await writeAudit({
      restaurantId,
      actorUserId,
      action: "products.update",
      entityType: "product",
      entityId: productId,
      changes: { before: { name: existing.name }, after: { name: input.name, slug } },
    });
  } catch (error) {
    rethrowPg(error);
  }
}

// ── Delete (soft) & bulk ────────────────────────────────────────────────────
export async function deleteProducts(
  restaurantId: string,
  actorUserId: string,
  ids: string[],
): Promise<number> {
  const owned = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        inArray(products.id, ids),
        eq(products.restaurantId, restaurantId),
        isNull(products.deletedAt),
      ),
    );
  if (owned.length === 0)
    throw new HttpError(404, "NOT_FOUND", "No matching products found.");

  const ownedIds = owned.map((r) => r.id);
  await db
    .update(products)
    .set({
      deletedAt: new Date(),
      isActive: false,
      isAvailable: false,
      updatedAt: new Date(),
    })
    .where(inArray(products.id, ownedIds));

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "products.delete",
    entityType: "product",
    changes: { after: { ids: ownedIds } },
  });
  return ownedIds.length;
}

const BULK_PATCH: Record<
  Exclude<ProductBulkAction, "delete">,
  Partial<typeof products.$inferInsert>
> = {
  activate: { isActive: true },
  deactivate: { isActive: false },
  mark_available: { isAvailable: true },
  mark_unavailable: { isAvailable: false },
  feature: { isFeatured: true },
  unfeature: { isFeatured: false },
  trend_on: { isTrending: true },
  trend_off: { isTrending: false },
};

export async function bulkUpdateProducts(
  restaurantId: string,
  actorUserId: string,
  ids: string[],
  action: ProductBulkAction,
): Promise<number> {
  if (action === "delete") return deleteProducts(restaurantId, actorUserId, ids);

  const patch = BULK_PATCH[action];
  const updated = await db
    .update(products)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        inArray(products.id, ids),
        eq(products.restaurantId, restaurantId),
        isNull(products.deletedAt),
      ),
    )
    .returning({ id: products.id });

  if (updated.length === 0) {
    throw new HttpError(404, "NOT_FOUND", "No matching products found.");
  }

  await writeAudit({
    restaurantId,
    actorUserId,
    action: `products.bulk.${action}`,
    entityType: "product",
    changes: { after: { ids: updated.map((r) => r.id) } },
  });
  return updated.length;
}

// ── Stock adjustment (ledger-consistent) ────────────────────────────────────
export async function adjustStock(
  restaurantId: string,
  actorUserId: string,
  productId: string,
  input: StockAdjustInput,
): Promise<{ quantity: number }> {
  await assertProductOwnership(restaurantId, productId);

  const result = await db.transaction(async (tx) => {
    const [level] = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.branchId, input.branchId),
          eq(inventoryLevels.productId, productId),
          input.variantId
            ? eq(inventoryLevels.variantId, input.variantId)
            : isNull(inventoryLevels.variantId),
        ),
      )
      .limit(1);

    const current = level?.quantity ?? 0;
    const next = current + input.quantity;
    if (next < 0) {
      throw new HttpError(
        409,
        "CONFLICT",
        `Not enough stock — only ${current} on hand at this branch.`,
      );
    }

    if (level) {
      await tx
        .update(inventoryLevels)
        .set({
          quantity: next,
          lowStockThreshold: input.lowStockThreshold ?? level.lowStockThreshold,
          updatedAt: new Date(),
        })
        .where(eq(inventoryLevels.id, level.id));
    } else {
      await tx.insert(inventoryLevels).values({
        branchId: input.branchId,
        productId,
        variantId: input.variantId ?? null,
        quantity: next,
        lowStockThreshold: input.lowStockThreshold ?? null,
      });
    }

    await tx.insert(inventoryMovements).values({
      branchId: input.branchId,
      productId,
      variantId: input.variantId ?? null,
      type: input.type,
      quantityDelta: input.quantity,
      note: blankToNull(input.note),
      createdByUserId: actorUserId,
    });

    return { quantity: next };
  });

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "inventory.adjust",
    entityType: "product",
    entityId: productId,
    changes: {
      after: { type: input.type, delta: input.quantity, branchId: input.branchId },
    },
  });

  return result;
}

// ── CSV export / import ─────────────────────────────────────────────────────
export async function exportProductsCsv(restaurantId: string): Promise<string> {
  const rows = await db
    .select({
      name: products.name,
      slug: products.slug,
      category: categories.name,
      price: products.basePriceCents,
      compareAt: products.compareAtPriceCents,
      sku: products.sku,
      barcode: products.barcode,
      foodType: products.foodType,
      spicyLevel: products.spicyLevel,
      shortDescription: products.shortDescription,
      isActive: products.isActive,
      isFeatured: products.isFeatured,
      isTrending: products.isTrending,
      isPopular: products.isPopular,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.restaurantId, restaurantId), isNull(products.deletedAt)))
    .orderBy(desc(products.updatedAt));

  return toCsv(
    [...PRODUCT_CSV_COLUMNS],
    rows.map((r) => ({
      name: r.name,
      slug: r.slug,
      category: r.category,
      price: (r.price / 100).toFixed(2),
      compare_at_price: r.compareAt != null ? (r.compareAt / 100).toFixed(2) : "",
      sku: r.sku ?? "",
      barcode: r.barcode ?? "",
      food_type: r.foodType,
      spicy_level: r.spicyLevel,
      short_description: r.shortDescription ?? "",
      is_active: r.isActive,
      is_featured: r.isFeatured,
      is_trending: r.isTrending,
      is_popular: r.isPopular,
    })),
  );
}

export type ImportSummary = {
  created: number;
  updated: number;
  failed: Array<{ row: number; name: string; error: string }>;
};

/** Find or create a category by display name (import convenience). */
async function resolveCategoryId(
  tx: Tx,
  restaurantId: string,
  name: string,
): Promise<string> {
  const trimmed = name.trim();
  const [existing] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.restaurantId, restaurantId),
        sql`lower(${categories.name}) = ${trimmed.toLowerCase()}`,
        isNull(categories.deletedAt),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const slug = slugify(trimmed) || "category";
  const [created] = await tx
    .insert(categories)
    .values({ restaurantId, name: trimmed, slug: `${slug}-${Date.now() % 100_000}` })
    .onConflictDoNothing()
    .returning({ id: categories.id });

  if (created) return created.id;
  // Extremely rare: concurrent import created it between read & insert.
  const [retry] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.restaurantId, restaurantId),
        sql`lower(${categories.name}) = ${trimmed.toLowerCase()}`,
      ),
    )
    .limit(1);
  return retry!.id;
}

export async function importProducts(
  restaurantId: string,
  actorUserId: string,
  rows: Array<{ row: number; data: ProductImportRow }>,
): Promise<ImportSummary> {
  const summary: ImportSummary = { created: 0, updated: 0, failed: [] };

  for (const { row, data } of rows) {
    try {
      const slug = slugify(data.slug || data.name);
      const outcome = await db.transaction(async (tx) => {
        const categoryId = await resolveCategoryId(tx, restaurantId, data.category);

        const [existing] = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.restaurantId, restaurantId), eq(products.slug, slug)))
          .limit(1);

        const values = {
          restaurantId,
          categoryId,
          name: data.name,
          slug: existing ? undefined : slug, // keep existing slug stable
          sku: data.sku || null,
          barcode: data.barcode || null,
          basePriceCents: toCents(data.price),
          compareAtPriceCents:
            data.compare_at_price != null ? toCents(data.compare_at_price) : null,
          foodType: data.food_type,
          spicyLevel: data.spicy_level,
          shortDescription: data.short_description || null,
          isActive: data.is_active,
          isFeatured: data.is_featured,
          isTrending: data.is_trending,
          isPopular: data.is_popular,
          updatedAt: new Date(),
        };

        if (existing) {
          await tx.update(products).set(values).where(eq(products.id, existing.id));
          return "updated" as const;
        }
        await tx.insert(products).values({ ...values, slug });
        return "created" as const;
      });

      if (outcome === "created") summary.created++;
      else summary.updated++;
    } catch (error) {
      summary.failed.push({
        row,
        name: data.name,
        error: error instanceof Error ? error.message : "Import failed",
      });
    }
  }

  if (summary.created + summary.updated > 0) {
    await writeAudit({
      restaurantId,
      actorUserId,
      action: "products.import",
      entityType: "product",
      changes: {
        after: {
          created: summary.created,
          updated: summary.updated,
          failed: summary.failed.length,
        },
      },
    });
  }

  return summary;
}

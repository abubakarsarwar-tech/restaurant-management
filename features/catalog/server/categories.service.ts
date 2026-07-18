import "server-only";

import { and, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { HttpError } from "@/lib/api";
import { slugify } from "@/utils/slugify";
import { writeAudit } from "@/lib/audit";

import { blankToNull, type CategoryUpsertInput } from "../schemas";

/**
 * Category mutations — slug uniqueness, hierarchy guards (no self/descendant
 * parents), product-preserving deletes, full audit trail.
 */

async function uniqueCategorySlug(
  restaurantId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "category";
  const [taken] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.restaurantId, restaurantId),
        eq(categories.slug, root),
        excludeId ? ne(categories.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  if (!taken) return root;

  let suffix = 2;
  for (;;) {
    const candidate = `${root}-${suffix}`;
    const [clash] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.restaurantId, restaurantId),
          eq(categories.slug, candidate),
          excludeId ? ne(categories.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    if (!clash) return candidate;
    suffix++;
  }
}

/** Walk up the tree: candidate parent can't be the category itself or below it. */
async function assertValidParent(
  restaurantId: string,
  categoryId: string,
  parentId: string | null | undefined,
) {
  if (!parentId) return;
  if (parentId === categoryId) {
    throw new HttpError(422, "VALIDATION_ERROR", "A category can't be its own parent.");
  }

  let cursor: string | null = parentId;
  for (let depth = 0; depth < 10 && cursor; depth++) {
    const [row] = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(
        and(
          eq(categories.id, cursor),
          eq(categories.restaurantId, restaurantId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    if (!row) {
      throw new HttpError(404, "NOT_FOUND", "Parent category not found.");
    }
    if (row.parentId === categoryId) {
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        "That would create a loop — pick a parent outside this branch.",
      );
    }
    cursor = row.parentId;
  }
}

function valuesFrom(input: CategoryUpsertInput, slug: string) {
  return {
    name: input.name,
    slug,
    parentId: input.parentId,
    description: blankToNull(input.description),
    imageMediaId: input.imageMediaId,
    bannerMediaId: input.bannerMediaId,
    icon: blankToNull(input.icon),
    colorTheme: blankToNull(input.colorTheme),
    isEditorsChoice: input.isEditorsChoice,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

export async function createCategory(
  restaurantId: string,
  actorUserId: string,
  input: CategoryUpsertInput,
): Promise<{ id: string }> {
  const slug = await uniqueCategorySlug(restaurantId, input.slug || input.name);

  if (input.parentId) {
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, input.parentId),
          eq(categories.restaurantId, restaurantId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    if (!parent) throw new HttpError(404, "NOT_FOUND", "Parent category not found.");
  }

  const [created] = await db
    .insert(categories)
    .values({ restaurantId, ...valuesFrom(input, slug) })
    .returning({ id: categories.id });

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "categories.create",
    entityType: "category",
    entityId: created!.id,
    changes: { after: { name: input.name, slug } },
  });

  return { id: created!.id };
}

export async function updateCategory(
  restaurantId: string,
  actorUserId: string,
  categoryId: string,
  input: CategoryUpsertInput,
): Promise<void> {
  const [existing] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.restaurantId, restaurantId),
        isNull(categories.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Category not found.");

  await assertValidParent(restaurantId, categoryId, input.parentId);
  const slug = await uniqueCategorySlug(
    restaurantId,
    input.slug || input.name,
    categoryId,
  );

  await db
    .update(categories)
    .set({ ...valuesFrom(input, slug), updatedAt: new Date() })
    .where(eq(categories.id, categoryId));

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "categories.update",
    entityType: "category",
    entityId: categoryId,
    changes: { before: { name: existing.name }, after: { name: input.name, slug } },
  });
}

export async function deleteCategory(
  restaurantId: string,
  actorUserId: string,
  categoryId: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.restaurantId, restaurantId),
        isNull(categories.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Category not found.");

  const [{ count: productCount }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt)));

  if (productCount > 0) {
    throw new HttpError(
      409,
      "CONFLICT",
      `This category still has ${productCount} product${productCount === 1 ? "" : "s"}. Move or delete them first.`,
    );
  }

  await db.transaction(async (tx) => {
    // Children float up to top-level instead of being deleted with the parent.
    await tx
      .update(categories)
      .set({ parentId: null, updatedAt: new Date() })
      .where(eq(categories.parentId, categoryId));

    await tx
      .update(categories)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, categoryId));
  });

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "categories.delete",
    entityType: "category",
    entityId: categoryId,
    changes: { before: { name: existing.name } },
  });
}

/** Inline table edits — visibility / editor's choice / sort order. */
export async function patchCategoryFlags(
  restaurantId: string,
  actorUserId: string,
  categoryId: string,
  patch: Partial<Pick<CategoryUpsertInput, "isActive" | "isEditorsChoice" | "sortOrder">>,
): Promise<void> {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.restaurantId, restaurantId),
        isNull(categories.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Category not found.");

  await db
    .update(categories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(categories.id, categoryId));

  await writeAudit({
    restaurantId,
    actorUserId,
    action: "categories.flags",
    entityType: "category",
    entityId: categoryId,
    changes: { after: patch },
  });
}

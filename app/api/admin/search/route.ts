import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { categories, customers, orders, products } from "@/db/schema";
import { fail, ok, withApiErrors } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";

/**
 * GET /api/admin/search?q= — grouped global search for ⌘K.
 * Small ILIKE fan-out, tenant-scoped, staff-only.
 */
export const dynamic = "force-dynamic";

export const GET = withApiErrors("admin.search", async (request: NextRequest) => {
  const session = await requireStaffApi();

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return ok({ products: [], categories: [], orders: [], customers: [] });
  }
  const tenantId = session.restaurantId;
  if (!tenantId) return fail("BAD_REQUEST", "No active restaurant context.", 400);

  const pattern = `%${q}%`;
  const limit = 5;

  const branchScope = session.branchIds.length
    ? eq(orders.branchId, session.branchIds[0])
    : undefined;

  const [foundProducts, foundCategories, foundOrders, foundCustomers] = await Promise.all(
    [
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          isActive: products.isActive,
        })
        .from(products)
        .where(
          and(
            eq(products.restaurantId, tenantId),
            or(ilike(products.name, pattern), ilike(products.sku, pattern)),
          ),
        )
        .orderBy(desc(products.popularityScore))
        .limit(limit),

      db
        .select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(categories)
        .where(
          and(eq(categories.restaurantId, tenantId), ilike(categories.name, pattern)),
        )
        .limit(3),

      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          customerName: customers.fullName,
        })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            eq(orders.restaurantId, tenantId),
            branchScope,
            or(
              ilike(customers.fullName, pattern),
              sql`${orders.orderNumber}::text ilike ${pattern}`,
            ),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(limit),

      db
        .select({
          id: customers.id,
          fullName: customers.fullName,
          phone: customers.phone,
        })
        .from(customers)
        .where(
          and(
            eq(customers.restaurantId, tenantId),
            or(ilike(customers.fullName, pattern), ilike(customers.phone, pattern)),
          ),
        )
        .orderBy(desc(customers.lastOrderAt))
        .limit(limit),
    ],
  );

  return ok({
    products: foundProducts,
    categories: foundCategories,
    orders: foundOrders,
    customers: foundCustomers,
  });
});

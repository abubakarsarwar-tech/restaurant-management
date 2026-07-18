import Link from "next/link";
import { DownloadIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { hasPermission, requireStaff } from "@/features/auth/server/session";
import {
  getProductFormMeta,
  ImportDialog,
  listProducts,
  productListQuerySchema,
  ProductsFilters,
  ProductsTable,
} from "@/features/catalog";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireStaff({
    permission: "catalog:read",
    next: "/admin/products",
  });

  if (!session.restaurantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No restaurant assigned</CardTitle>
          <CardDescription>
            Your account isn&apos;t linked to a restaurant yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const raw = await searchParams;
  const query = productListQuerySchema.parse({
    q: first(raw.q),
    categoryId: first(raw.categoryId) || undefined,
    status: first(raw.status) || undefined,
    foodType: first(raw.foodType) || undefined,
    sort: first(raw.sort) || undefined,
    page: first(raw.page),
    pageSize: first(raw.pageSize),
  });

  const [list, meta] = await Promise.all([
    listProducts(session.restaurantId, query),
    getProductFormMeta(session.restaurantId),
  ]);

  const canCreate = hasPermission(session, "catalog:create");
  const canUpdate = hasPermission(session, "catalog:update");
  const canDelete = hasPermission(session, "catalog:delete");
  const canStock = hasPermission(session, "inventory:manage");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Your complete menu — dishes, prices, stock and merchandising in one place."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/api/admin/products/export" download>
                <DownloadIcon /> Export
              </a>
            </Button>
            {canCreate ? <ImportDialog /> : null}
            {canCreate ? (
              <Button asChild>
                <Link href="/admin/products/new">
                  <PlusIcon /> New product
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <ProductsFilters categories={meta.categories} />

      <ProductsTable
        rows={list.rows}
        branches={meta.branches}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canStock={canStock}
      />

      <PaginationControls
        total={list.total}
        page={query.page}
        pageSize={query.pageSize}
      />
    </div>
  );
}

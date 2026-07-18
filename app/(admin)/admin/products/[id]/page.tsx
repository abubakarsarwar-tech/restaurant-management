import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission, requireStaff } from "@/features/auth/server/session";
import { getProductEditor, getProductFormMeta, ProductForm } from "@/features/catalog";
import { StockAdjustButton } from "@/features/catalog/components/product-inventory-panel";
import { cn } from "@/lib/utils";

export const metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaff({
    permission: "catalog:read",
    next: `/admin/products/${id}`,
  });
  const restaurantId = session.restaurantId!;

  const [product, meta] = await Promise.all([
    getProductEditor(restaurantId, id),
    getProductFormMeta(restaurantId),
  ]);
  if (!product) notFound();

  const canUpdate = hasPermission(session, "catalog:update");
  const canStock = hasPermission(session, "inventory:manage");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={product.name}
        description={
          canUpdate
            ? `/${product.slug} — last synced with the storefront on save.`
            : "Read-only — you don't have the catalog:update permission."
        }
      />

      {product.trackInventory ? (
        <Card>
          <CardHeader>
            <CardTitle>Inventory by branch</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {product.inventory.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No stock rows yet — adjustments will create them.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Alert below</TableHead>
                    {canStock ? <TableHead /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.inventory.map((level) => {
                    const low =
                      level.lowStockThreshold != null &&
                      level.quantity <= level.lowStockThreshold;
                    return (
                      <TableRow key={`${level.branchId}-${level.variantId ?? "base"}`}>
                        <TableCell className="text-sm font-medium">
                          {level.branchName}
                        </TableCell>
                        <TableCell>
                          {level.variantName ? (
                            <Badge variant="outline">{level.variantName}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">base</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-sm font-semibold tabular-nums",
                            low && "text-destructive",
                          )}
                        >
                          {level.quantity}
                          {low ? " · low" : ""}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                          {level.reservedQuantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                          {level.lowStockThreshold ?? "—"}
                        </TableCell>
                        {canStock ? (
                          <TableCell className="text-right">
                            <StockAdjustButton
                              productId={product.id}
                              productName={`${product.name}${level.variantName ? ` — ${level.variantName}` : ""}`}
                              branchId={level.branchId}
                              variantId={level.variantId}
                              currentQuantity={level.quantity}
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <ProductForm meta={meta} product={product} canUpdate={canUpdate} />
    </div>
  );
}

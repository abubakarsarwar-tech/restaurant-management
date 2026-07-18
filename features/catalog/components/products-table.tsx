"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EyeOffIcon,
  LeafIcon,
  MoreHorizontalIcon,
  PackagePlusIcon,
  PencilIcon,
  StarIcon,
  FlameIcon,
  Trash2Icon,
  TrendingUpIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError } from "@/services/api-client";
import { bulkProducts, deleteProduct } from "@/services/catalog-admin.service";
import { formatPrice, timeAgo } from "@/utils/format";
import type { BranchOption, ProductListRow } from "../types";
import type { ProductBulkAction } from "../schemas";
import { StockAdjustDialog } from "./stock-adjust-dialog";
import { cn } from "@/lib/utils";

/**
 * ProductsTable — the admin catalog grid: row selection with a floating
 * bulk-actions bar, inline status switch, stock adjust & guarded deletes.
 */
export function ProductsTable({
  rows,
  branches,
  canUpdate,
  canDelete,
  canStock,
}: {
  rows: ProductListRow[];
  branches: BranchOption[];
  canUpdate: boolean;
  canDelete: boolean;
  canStock: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductListRow | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const allChecked = rows.length > 0 && selected.size === rows.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function runBulk(ids: string[], action: ProductBulkAction, label: string) {
    setPendingIds(new Set(ids));
    try {
      const { affected } = await bulkProducts(ids, action);
      toast.success(
        `${label} applied to ${affected} product${affected === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed.");
    } finally {
      setPendingIds(new Set());
    }
  }

  const flagBadges = (row: ProductListRow) =>
    (
      [
        [row.isFeatured, "Featured", StarIcon, "accent"],
        [row.isTrending, "Trending", TrendingUpIcon, "warning"],
        [row.isPopular, "Popular", FlameIcon, "secondary"],
      ] as const
    ).filter(([on]) => on);

  const selectionLabel = useMemo(() => String(selected.size), [selected]);

  if (rows.length === 0) {
    return (
      <Card className="py-2">
        <EmptyState
          icon={UtensilsCrossedIcon}
          title="No dishes found"
          description="Adjust your filters, or add your first dish to build the menu."
          action={
            canUpdate ? (
              <Button asChild>
                <Link href="/admin/products/new">New product</Link>
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Highlights</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Live</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={selected.has(row.id) ? "selected" : undefined}
                className={cn(pendingIds.has(row.id) && "opacity-50")}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={(checked) => toggleOne(row.id, !!checked)}
                    aria-label={`Select ${row.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-lg">
                      {row.imageUrl ? (
                        <Image
                          src={row.imageUrl}
                          alt={row.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <UtensilsCrossedIcon className="text-muted-foreground/40 absolute inset-0 m-auto size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${row.id}`}
                        className="hover:text-primary block max-w-52 truncate text-sm font-medium transition-colors"
                      >
                        {row.name}
                      </Link>
                      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        {row.sku ? <span className="font-mono">{row.sku}</span> : null}
                        {row.foodType === "VEGETARIAN" || row.foodType === "VEGAN" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <LeafIcon className="size-3.5 text-emerald-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {row.foodType === "VEGAN" ? "Vegan" : "Vegetarian"}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        {row.variantCount > 0 ? (
                          <span>{row.variantCount} variants</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {row.categoryName}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <span className="text-sm font-medium tabular-nums">
                    {formatPrice(row.basePriceCents)}
                  </span>
                  {row.compareAtPriceCents ? (
                    <span className="text-muted-foreground ml-1.5 text-xs tabular-nums line-through">
                      {formatPrice(row.compareAtPriceCents)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {flagBadges(row).map(([, label, Icon, variant]) => (
                      <Badge key={label} variant={variant} className="gap-1 px-1.5">
                        <Icon className="size-3" />
                        {label}
                      </Badge>
                    ))}
                    {!row.isActive ? (
                      <Badge variant="outline" className="gap-1 px-1.5">
                        <EyeOffIcon className="size-3" /> Hidden
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {row.trackInventory ? (
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        row.lowStock && "text-destructive",
                      )}
                    >
                      {row.stockOnHand}
                      {row.lowStock ? " · low" : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs">not tracked</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={row.isActive}
                    disabled={!canUpdate || pendingIds.has(row.id)}
                    onCheckedChange={(checked) =>
                      void runBulk(
                        [row.id],
                        checked ? "activate" : "deactivate",
                        checked ? "Activated" : "Deactivated",
                      )
                    }
                    aria-label={row.isActive ? "Deactivate" : "Activate"}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {timeAgo(row.updatedAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/products/${row.id}`}>
                          <PencilIcon /> Edit
                        </Link>
                      </DropdownMenuItem>
                      {canStock && row.trackInventory ? (
                        <DropdownMenuItem onSelect={() => setStockTarget(row)}>
                          <PackagePlusIcon /> Adjust stock
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setConfirmDelete([row.id])}
                          >
                            <Trash2Icon /> Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* floating bulk bar */}
      {selected.size > 0 && (canUpdate || canDelete) ? (
        <div className="bg-card/95 animate-in slide-in-from-bottom-4 fade-in-0 fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border p-2.5 shadow-xl backdrop-blur-sm sm:bottom-6">
          <span className="pl-2 text-sm font-medium tabular-nums">
            {selectionLabel} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {canUpdate ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runBulk([...selected], "activate", "Activated")}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runBulk([...selected], "deactivate", "Deactivated")}
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void runBulk([...selected], "mark_available", "Available")
                  }
                >
                  In stock today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runBulk([...selected], "feature", "Featured")}
                >
                  Feature
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDelete([...selected])}
              >
                <Trash2Icon /> Delete
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={
          confirmDelete && confirmDelete.length > 1
            ? `Delete ${confirmDelete.length} products?`
            : "Delete this product?"
        }
        description="The dish disappears from the menu immediately (archived, not erased — order history stays intact)."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            if (confirmDelete.length === 1) {
              await deleteProduct(confirmDelete[0]!);
            } else {
              await bulkProducts(confirmDelete, "delete");
            }
            toast.success(
              confirmDelete.length > 1
                ? `${confirmDelete.length} products deleted.`
                : "Product deleted.",
            );
            setSelected(new Set());
            router.refresh();
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Delete failed.");
            throw error;
          }
        }}
      />

      {stockTarget ? (
        <StockAdjustDialog
          product={stockTarget}
          branches={branches}
          onClose={() => setStockTarget(null)}
        />
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FolderTreeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError } from "@/services/api-client";
import { deleteCategory, patchCategoryFlags } from "@/services/catalog-admin.service";
import { CATEGORY_ICON_MAP, CATEGORY_THEME_MAP } from "../constants";
import type { CategoryListRow } from "../types";
import { cn } from "@/lib/utils";

/**
 * CategoriesTable — hierarchy-aware grid with inline visibility / editor's
 * choice switches and sort-order steppers. Edit & delete via row menu.
 */
export function CategoriesTable({
  rows,
  canUpdate,
  canDelete,
  onEdit,
}: {
  rows: CategoryListRow[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (row: CategoryListRow) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<CategoryListRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function patch(
    id: string,
    body: Parameters<typeof patchCategoryFlags>[1],
    label: string,
  ) {
    setPendingId(id);
    try {
      await patchCategoryFlags(id, body);
      toast.success(label);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Update failed.");
    } finally {
      setPendingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <Card className="py-2">
        <EmptyState
          icon={FolderTreeIcon}
          title="No categories yet"
          description="Categories organize your menu — create “Pizzas”, “Burgers”, “Desserts”…"
        />
      </Card>
    );
  }

  // Parents first, children directly after (rows arrive sort-ordered).
  const ordered: CategoryListRow[] = [];
  const childrenOf = new Map<string, CategoryListRow[]>();
  for (const row of rows) {
    if (row.parentId) {
      childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row]);
    }
  }
  for (const row of rows) {
    if (row.parentId) continue;
    ordered.push(row, ...(childrenOf.get(row.id) ?? []));
  }
  // orphans (parent deleted but row still points at it) — safety net
  for (const row of rows) {
    if (row.parentId && !ordered.includes(row)) ordered.push(row);
  }

  return (
    <>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Editor&#39;s choice</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="w-28">Order</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((row) => {
              const Icon = CATEGORY_ICON_MAP.get(row.icon ?? "general");
              const theme = CATEGORY_THEME_MAP.get(row.colorTheme ?? "flame");
              return (
                <TableRow
                  key={row.id}
                  className={cn(pendingId === row.id && "opacity-60")}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                          !row.imageUrl && (theme?.soft ?? "bg-muted"),
                        )}
                      >
                        {row.imageUrl ? (
                          <Image
                            src={row.imageUrl}
                            alt={row.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : Icon ? (
                          <Icon className="size-5" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-52 truncate text-sm font-medium">
                          {row.parentId ? (
                            <span className="text-muted-foreground/60">└ </span>
                          ) : null}
                          {row.name}
                          {row.isEditorsChoice ? (
                            <StarIcon
                              className="text-warning mb-0.5 ml-1.5 inline size-3.5"
                              fill="currentColor"
                            />
                          ) : null}
                        </p>
                        <p className="text-muted-foreground font-mono text-xs">
                          /{row.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.parentName ? (
                      <Badge variant="outline">{row.parentName}</Badge>
                    ) : row.childCount > 0 ? (
                      <span className="text-muted-foreground text-xs">
                        {row.childCount} {row.childCount === 1 ? "child" : "children"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">top level</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium tabular-nums">
                      {row.productCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.isEditorsChoice}
                      disabled={!canUpdate || pendingId === row.id}
                      onCheckedChange={(checked) =>
                        void patch(
                          row.id,
                          { isEditorsChoice: checked },
                          checked
                            ? "Marked as editor's choice."
                            : "Removed from editor's choice.",
                        )
                      }
                      aria-label="Toggle editor's choice"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.isActive}
                      disabled={!canUpdate || pendingId === row.id}
                      onCheckedChange={(checked) =>
                        void patch(
                          row.id,
                          { isActive: checked },
                          checked
                            ? "Category visible on the storefront."
                            : "Category hidden.",
                        )
                      }
                      aria-label="Toggle visibility"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`${row.id}-${row.sortOrder}`}
                      type="number"
                      min={0}
                      defaultValue={row.sortOrder}
                      disabled={!canUpdate || pendingId === row.id}
                      className="h-8 w-20 tabular-nums"
                      aria-label="Sort order"
                      onBlur={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next) && next !== row.sortOrder) {
                          void patch(row.id, { sortOrder: next }, "Sort order updated.");
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(row)}>
                          <PencilIcon /> Edit
                        </DropdownMenuItem>
                        {canDelete ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setConfirmDelete(row)}
                              disabled={row.productCount > 0}
                            >
                              <Trash2Icon /> Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={`Delete “${confirmDelete?.name}”?`}
        description="Child categories become top-level. You can't delete a category that still has products."
        confirmLabel="Delete category"
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await deleteCategory(confirmDelete.id);
            toast.success("Category deleted.");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Delete failed.");
            throw error;
          }
        }}
      />
    </>
  );
}

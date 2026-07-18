"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CategoryListRow } from "../types";
import { CategoriesTable } from "./categories-table";
import { CategoryFormDialog } from "./category-form-dialog";

/**
 * CategoriesClient — owns dialog state (create / edit) around the table so
 * the page itself stays a server component.
 */
export function CategoriesClient({
  rows,
  canCreate,
  canUpdate,
  canDelete,
}: {
  rows: CategoryListRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryListRow | null>(null);

  return (
    <>
      {canCreate ? (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <PlusIcon /> New category
          </Button>
        </div>
      ) : null}

      <CategoriesTable
        rows={rows}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={(row) => {
          setEditing(row);
          setDialogOpen(true);
        }}
      />

      <CategoryFormDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        rows={rows}
        canUpdate={canUpdate}
      />
    </>
  );
}

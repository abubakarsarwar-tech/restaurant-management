"use client";

import { api } from "@/services/api-client";
import type {
  CategoryUpsertInput,
  ProductBulkAction,
  ProductUpsertInput,
  StockAdjustInput,
} from "@/features/catalog/schemas";

/**
 * Admin catalog mutations — thin typed wrappers over the /api/admin routes,
 * consumed by the products/categories tables, dialogs and the product editor.
 */

// ── Products ────────────────────────────────────────────────────────────────
export function createProduct(input: ProductUpsertInput) {
  return api.post<{ id: string }>("/admin/products", input);
}

export function updateProduct(id: string, input: ProductUpsertInput) {
  return api.patch<{ id: string }>(`/admin/products/${id}`, input);
}

export function deleteProduct(id: string) {
  return api.delete<{ deleted: number }>(`/admin/products/${id}`);
}

export function bulkProducts(ids: string[], action: ProductBulkAction) {
  return api.post<{ affected: number }>("/admin/products/bulk", { ids, action });
}

export function adjustProductStock(productId: string, input: StockAdjustInput) {
  return api.post<{ quantity: number }>(`/admin/products/${productId}/stock`, input);
}

export type ImportResult = {
  created: number;
  updated: number;
  failed: Array<{ row: number; name: string; error: string }>;
};

export function importProducts(
  rows: Array<{ row: number; data: Record<string, unknown> }>,
) {
  return api.post<ImportResult>("/admin/products/import", { rows });
}

// ── Categories ──────────────────────────────────────────────────────────────
export function createCategory(input: CategoryUpsertInput) {
  return api.post<{ id: string }>("/admin/categories", input);
}

export function updateCategory(id: string, input: CategoryUpsertInput) {
  return api.patch<{ id: string }>(`/admin/categories/${id}`, input);
}

export function patchCategoryFlags(
  id: string,
  patch: Partial<Pick<CategoryUpsertInput, "isActive" | "isEditorsChoice" | "sortOrder">>,
) {
  return api.patch<{ id: string }>(`/admin/categories/${id}`, patch);
}

export function deleteCategory(id: string) {
  return api.delete<{ id: string }>(`/admin/categories/${id}`);
}

/**
 * features/catalog public API — product & category management (Part 5).
 * Server modules are importable from route handlers / RSC; components are
 * client-side building blocks for admin pages.
 */
export {
  listProducts,
  getProductEditor,
  getProductFormMeta,
  type ProductFormMeta,
} from "./server/products.queries";
export { listCategories } from "./server/categories.queries";
export { productListQuerySchema } from "./schemas";
export type { ProductListRow, CategoryListRow, ProductEditorData } from "./types";
export { ProductsTable } from "./components/products-table";
export { ProductsFilters } from "./components/products-filters";
export { ProductForm } from "./components/product-form";
export { ImportDialog } from "./components/import-dialog";
export { CategoriesClient } from "./components/categories-client";

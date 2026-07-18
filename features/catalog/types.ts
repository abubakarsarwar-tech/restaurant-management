/**
 * Catalog read models — shapes the admin UI consumes. All money in cents.
 */

export type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  imageUrl: string | null;
  categoryName: string;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  foodType: string;
  spicyLevel: string;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isPopular: boolean;
  trackInventory: boolean;
  /** summed on-hand across branches (null when not tracked) */
  stockOnHand: number | null;
  /** true when any tracked branch level sits at/below its threshold */
  lowStock: boolean;
  variantCount: number;
  updatedAt: Date;
};

export type CategoryListRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  imageMediaId: string | null;
  bannerMediaId: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  icon: string | null;
  colorTheme: string | null;
  isEditorsChoice: boolean;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  childCount: number;
};

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TagOption = { id: string; name: string };

export type BranchOption = { id: string; name: string; code: string; isMain: boolean };

/** Full editor payload for the product form (prices in cents). */
export type ProductEditorData = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  costCents: number | null;
  foodType: string;
  spicyLevel: string;
  prepTimeMinutes: number | null;
  calories: number | null;
  servingInfo: string | null;
  isActive: boolean;
  isAvailable: boolean;
  trackInventory: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isPopular: boolean;
  availableDays: number[];
  availableFrom: string | null;
  availableTo: string | null;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  images: Array<{
    mediaId: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  tags: string[];
  variants: Array<{
    id: string;
    name: string;
    optionGroup: string | null;
    optionValue: string | null;
    sku: string | null;
    barcode: string | null;
    priceCents: number;
    compareAtPriceCents: number | null;
    costCents: number | null;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
  }>;
  addonGroups: Array<{
    id: string;
    name: string;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number | null;
    sortOrder: number;
    addons: Array<{
      id: string;
      name: string;
      priceCents: number;
      maxQuantity: number;
      isActive: boolean;
      sortOrder: number;
    }>;
  }>;
  inventory: Array<{
    branchId: string;
    branchName: string;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number | null;
  }>;
};

import {
  Apple,
  Beef,
  CakeSlice,
  Carrot,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Drumstick,
  Egg,
  Fish,
  IceCreamCone,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";

/**
 * Catalog domain constants — option catalogs for forms, filters and the
 * storefront. Pure data; safe on both server and client.
 */

// ── Food type / spiciness ───────────────────────────────────────────────────
export const FOOD_TYPE_OPTIONS = [
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "NON_VEGETARIAN", label: "Non-vegetarian" },
  { value: "VEGAN", label: "Vegan" },
] as const;
export type FoodTypeValue = (typeof FOOD_TYPE_OPTIONS)[number]["value"];

export const SPICY_LEVEL_OPTIONS = [
  { value: "NONE", label: "Not spicy" },
  { value: "MILD", label: "Mild" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HOT", label: "Hot" },
  { value: "EXTRA_HOT", label: "Extra hot" },
] as const;

// ── Availability weekdays (0 = Sunday … 6 = Saturday, matching the DB) ──────
export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday", short: "Su" },
  { value: 1, label: "Monday", short: "Mo" },
  { value: 2, label: "Tuesday", short: "Tu" },
  { value: 3, label: "Wednesday", short: "We" },
  { value: 4, label: "Thursday", short: "Th" },
  { value: 5, label: "Friday", short: "Fr" },
  { value: 6, label: "Saturday", short: "Sa" },
] as const;

// ── Category presentation ───────────────────────────────────────────────────
/** Curated Lucide icon keys for the category icon picker. */
export const CATEGORY_ICON_OPTIONS: Array<{
  key: string;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "pizza", label: "Pizza", icon: Pizza },
  { key: "burger", label: "Burger", icon: Sandwich },
  { key: "beef", label: "Grill & beef", icon: Beef },
  { key: "chicken", label: "Chicken", icon: Drumstick },
  { key: "fish", label: "Seafood", icon: Fish },
  { key: "shrimp", label: "Shrimp", icon: Shrimp },
  { key: "rice", label: "Rice & grains", icon: Wheat },
  { key: "soup", label: "Soups", icon: Soup },
  { key: "salad", label: "Salads", icon: Salad },
  { key: "veggies", label: "Vegetables", icon: Carrot },
  { key: "fruit", label: "Fruit", icon: Cherry },
  { key: "citrus", label: "Fresh & citrus", icon: Citrus },
  { key: "apple", label: "Healthy", icon: Apple },
  { key: "eggs", label: "Breakfast", icon: Egg },
  { key: "bakery", label: "Bakery", icon: Croissant },
  { key: "donut", label: "Donuts", icon: Donut },
  { key: "cookie", label: "Cookies", icon: Cookie },
  { key: "cake", label: "Cakes & desserts", icon: CakeSlice },
  { key: "icecream", label: "Ice cream", icon: IceCreamCone },
  { key: "snacks", label: "Snacks", icon: Popcorn },
  { key: "milk", label: "Dairy", icon: Milk },
  { key: "coffee", label: "Coffee", icon: Coffee },
  { key: "drinks", label: "Drinks", icon: CupSoda },
  { key: "general", label: "General", icon: UtensilsCrossed },
];

export const CATEGORY_ICON_MAP: Map<string, LucideIcon> = new Map(
  CATEGORY_ICON_OPTIONS.map((o) => [o.key, o.icon]),
);

/** Color themes for category cards — tokenized Tailwind pairs. */
export const CATEGORY_COLOR_THEMES = [
  {
    key: "flame",
    label: "Flame",
    swatch: "bg-orange-500",
    soft: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  },
  {
    key: "amber",
    label: "Amber",
    swatch: "bg-amber-500",
    soft: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  {
    key: "rose",
    label: "Rose",
    swatch: "bg-rose-500",
    soft: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  },
  {
    key: "emerald",
    label: "Emerald",
    swatch: "bg-emerald-500",
    soft: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "sky",
    label: "Sky",
    swatch: "bg-sky-500",
    soft: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
  {
    key: "violet",
    label: "Violet",
    swatch: "bg-violet-500",
    soft: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  },
  {
    key: "fuchsia",
    label: "Fuchsia",
    swatch: "bg-fuchsia-500",
    soft: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    key: "slate",
    label: "Slate",
    swatch: "bg-slate-500",
    soft: "bg-slate-500/12 text-slate-600 dark:text-slate-400",
  },
] as const;

export const CATEGORY_THEME_MAP: Map<string, (typeof CATEGORY_COLOR_THEMES)[number]> =
  new Map(CATEGORY_COLOR_THEMES.map((t) => [t.key, t]));

// ── Product list filters ────────────────────────────────────────────────────
export const PRODUCT_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "available", label: "Available today" },
  { value: "unavailable", label: "Unavailable" },
  { value: "featured", label: "Featured" },
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Popular" },
  { value: "low_stock", label: "Low stock" },
] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number]["value"];

export const PRODUCT_SORT_OPTIONS = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "created_desc", label: "Newest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price low → high" },
  { value: "price_desc", label: "Price high → low" },
  { value: "sort_asc", label: "Menu order" },
] as const;

// ── CSV import/export contract ──────────────────────────────────────────────
export const PRODUCT_CSV_COLUMNS = [
  "name",
  "slug",
  "category",
  "price",
  "compare_at_price",
  "sku",
  "barcode",
  "food_type",
  "spicy_level",
  "short_description",
  "is_active",
  "is_featured",
  "is_trending",
  "is_popular",
] as const;

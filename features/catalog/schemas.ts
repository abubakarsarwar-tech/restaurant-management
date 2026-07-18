import { z } from "zod";

/**
 * Catalog validation — every admin form & API payload funnels through these
 * schemas. Money travels in MAJOR units (15.99) here; services convert to
 * integer cents at the persistence boundary (see products.service).
 *
 * Design rule: RHF-bound schemas keep INPUT type ≡ OUTPUT type (no
 * type-changing transforms) so zodResolver stays perfectly typed. "" ⇄ null
 * normalization for optional fields happens in the service layer.
 */

const uuid = z.uuid({ message: "Invalid identifier." });

const moneyMajor = z
  .number({ message: "Enter a valid amount." })
  .nonnegative("Amount can't be negative.")
  .max(1_000_000, "Amount is too large.");

const optionalMoneyMajor = moneyMajor.nullable();

const optionalText = (max: number) =>
  z.string().trim().max(max, `Keep it under ${max} characters.`).nullable();

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour).")
  .or(z.literal(""))
  .nullable();

export const blankToNull = (value: string | null | undefined): string | null =>
  value == null || value.trim() === "" ? null : value.trim();

export const blankTimeToNull = blankToNull;

// ── Variants & add-ons ──────────────────────────────────────────────────────
export const productVariantSchema = z
  .object({
    id: uuid.optional(), // present on update of an existing row
    name: z.string().trim().min(1, "Variant needs a name.").max(120),
    /** attribute axis, e.g. { group: "Size", value: "Large" } */
    option: z
      .object({
        group: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(120),
      })
      .nullable()
      .optional(),
    sku: optionalText(64),
    barcode: optionalText(64),
    price: moneyMajor,
    compareAtPrice: optionalMoneyMajor,
    cost: optionalMoneyMajor,
    isDefault: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => v.compareAtPrice == null || v.compareAtPrice >= v.price, {
    message: "Compare-at price should be ≥ price.",
    path: ["compareAtPrice"],
  });

export const addonSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Add-on needs a name.").max(120),
  price: moneyMajor,
  maxQuantity: z.number().int().min(1, "At least 1.").max(20),
  isActive: z.boolean(),
});

export const addonGroupSchema = z
  .object({
    id: uuid.optional(),
    name: z.string().trim().min(1, "Group needs a name.").max(120),
    isRequired: z.boolean(),
    minSelections: z.number().int().min(0).max(50),
    maxSelections: z.number().int().min(0).max(50).nullable(),
    addons: z.array(addonSchema).min(1, "Add at least one option."),
  })
  .refine((g) => g.maxSelections == null || g.maxSelections >= g.minSelections, {
    message: "Max selections can't be below min selections.",
    path: ["maxSelections"],
  });

// ── Product upsert (create & update share one contract) ─────────────────────
export const productUpsertSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short.").max(180),
    slug: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes.")
      .or(z.literal("")),
    categoryId: uuid.describe("Pick a category."),
    shortDescription: optionalText(255),
    description: optionalText(5000),

    sku: optionalText(64),
    barcode: optionalText(64),
    basePrice: moneyMajor,
    compareAtPrice: optionalMoneyMajor,
    cost: optionalMoneyMajor,

    foodType: z.enum(["VEGETARIAN", "NON_VEGETARIAN", "VEGAN"]),
    spicyLevel: z.enum(["NONE", "MILD", "MEDIUM", "HOT", "EXTRA_HOT"]),
    prepTimeMinutes: z.number().int().min(1).max(600).nullable(),
    calories: z.number().int().min(0).max(100_000).nullable(),
    servingInfo: optionalText(80),

    isActive: z.boolean(),
    isAvailable: z.boolean(),
    trackInventory: z.boolean(),
    isFeatured: z.boolean(),
    isTrending: z.boolean(),
    isPopular: z.boolean(),

    availableDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Pick at least one day."),
    availableFrom: timeString,
    availableTo: timeString,

    sortOrder: z.number().int().min(0).max(100_000),

    seoTitle: optionalText(255),
    seoDescription: optionalText(320),

    /** gallery — ordered; exactly one (or zero, → first used) primary */
    images: z
      .array(z.object({ mediaId: uuid, isPrimary: z.boolean() }))
      .max(12, "Keep galleries under 12 images."),

    tags: z.array(z.string().trim().min(1).max(80)).max(12, "Keep it under 12 tags."),

    variants: z.array(productVariantSchema).max(25, "Too many variants."),
    addonGroups: z.array(addonGroupSchema).max(10, "Too many add-on groups."),

    /** create-only convenience: opening stock at the main branch */
    initialStock: z
      .object({
        quantity: z.number().int().min(0).max(1_000_000),
        lowStockThreshold: z.number().int().min(0).max(1_000_000).nullable(),
      })
      .nullable(),
  })
  .refine((p) => p.compareAtPrice == null || p.compareAtPrice >= p.basePrice, {
    message: "Compare-at price should be ≥ base price.",
    path: ["compareAtPrice"],
  })
  .refine((p) => p.variants.filter((v) => v.isDefault).length <= 1, {
    message: "Only one variant can be the default.",
    path: ["variants"],
  })
  .refine(
    (p) =>
      new Set(p.variants.map((v) => v.name.toLowerCase())).size === p.variants.length,
    { message: "Variant names must be unique.", path: ["variants"] },
  );

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

// ── Category upsert ─────────────────────────────────────────────────────────
export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(160),
  slug: z
    .string()
    .trim()
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes.")
    .or(z.literal("")),
  parentId: uuid.nullable(),
  description: optionalText(1000),
  imageMediaId: uuid.nullable(),
  bannerMediaId: uuid.nullable(),
  icon: z.string().trim().max(60).nullable(),
  colorTheme: z.string().trim().max(24).nullable(),
  isEditorsChoice: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(100_000),
});

export type CategoryUpsertInput = z.infer<typeof categoryUpsertSchema>;

// ── List query (search params) ──────────────────────────────────────────────
export const productListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: uuid.optional(),
  status: z
    .enum([
      "all",
      "active",
      "inactive",
      "available",
      "unavailable",
      "featured",
      "trending",
      "popular",
      "low_stock",
    ])
    .default("all"),
  foodType: z.enum(["VEGETARIAN", "NON_VEGETARIAN", "VEGAN"]).optional(),
  sort: z
    .enum([
      "updated_desc",
      "created_desc",
      "name_asc",
      "name_desc",
      "price_asc",
      "price_desc",
      "sort_asc",
    ])
    .default("updated_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

// ── Bulk actions ────────────────────────────────────────────────────────────
export const productBulkActionSchema = z.object({
  ids: z.array(uuid).min(1, "Select at least one product.").max(200),
  action: z.enum([
    "activate",
    "deactivate",
    "mark_available",
    "mark_unavailable",
    "feature",
    "unfeature",
    "trend_on",
    "trend_off",
    "delete",
  ]),
});

export type ProductBulkAction = z.infer<typeof productBulkActionSchema>["action"];

// ── Stock adjustment ────────────────────────────────────────────────────────
export const stockAdjustSchema = z.object({
  branchId: uuid,
  variantId: uuid.nullable().optional(),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "WASTE", "RETURN", "TRANSFER"]),
  quantity: z
    .number({ message: "Enter a quantity." })
    .int("Whole units only.")
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, { message: "Quantity can't be zero." }),
  note: optionalText(500),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

// ── CSV import row (parse-only — transforms are fine away from RHF) ─────────
const csvBoolean = z
  .string()
  .transform((v) => ["true", "1", "yes", "y"].includes(v.trim().toLowerCase()))
  .or(z.boolean());

export const productImportRowSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(200).optional().or(z.literal("")),
  category: z.string().trim().min(1, "Category is required."),
  price: z.coerce
    .number({ message: "Price must be a number." })
    .nonnegative()
    .max(1_000_000),
  compare_at_price: z
    .union([z.coerce.number().nonnegative().max(1_000_000), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .optional(),
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  barcode: z.string().trim().max(64).optional().or(z.literal("")),
  food_type: z.enum(["VEGETARIAN", "NON_VEGETARIAN", "VEGAN"]).catch("NON_VEGETARIAN"),
  spicy_level: z.enum(["NONE", "MILD", "MEDIUM", "HOT", "EXTRA_HOT"]).catch("NONE"),
  short_description: z.string().trim().max(255).optional().or(z.literal("")),
  is_active: csvBoolean.catch(true),
  is_featured: csvBoolean.catch(false),
  is_trending: csvBoolean.catch(false),
  is_popular: csvBoolean.catch(false),
});

export type ProductImportRow = z.infer<typeof productImportRowSchema>;

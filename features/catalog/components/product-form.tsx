"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/services/api-client";
import { createProduct, updateProduct } from "@/services/catalog-admin.service";
import { slugify } from "@/utils/slugify";
import { FOOD_TYPE_OPTIONS, SPICY_LEVEL_OPTIONS, WEEKDAY_OPTIONS } from "../constants";
import { productUpsertSchema, type ProductUpsertInput } from "../schemas";
import type { ProductEditorData } from "../types";
import type { ProductFormMeta } from "../server/products.queries";
import type { MediaSelection } from "@/features/media/types";
import { numberChange } from "./number-change";
import { TagsField } from "./tags-field";
import { VariantsField } from "./variants-field";
import { AddonGroupsField } from "./addon-groups-field";
import { ProductMediaField } from "./product-media-field";

type GalleryItem = MediaSelection & { isPrimary?: boolean };

const centsToMajor = (cents: number | null): number | null =>
  cents == null ? null : cents / 100;

function toFormValues(data: ProductEditorData): ProductUpsertInput {
  return {
    name: data.name,
    slug: data.slug,
    categoryId: data.categoryId,
    shortDescription: data.shortDescription,
    description: data.description,
    sku: data.sku,
    barcode: data.barcode,
    basePrice: data.basePriceCents / 100,
    compareAtPrice: centsToMajor(data.compareAtPriceCents),
    cost: centsToMajor(data.costCents),
    foodType: data.foodType as ProductUpsertInput["foodType"],
    spicyLevel: data.spicyLevel as ProductUpsertInput["spicyLevel"],
    prepTimeMinutes: data.prepTimeMinutes,
    calories: data.calories,
    servingInfo: data.servingInfo,
    isActive: data.isActive,
    isAvailable: data.isAvailable,
    trackInventory: data.trackInventory,
    isFeatured: data.isFeatured,
    isTrending: data.isTrending,
    isPopular: data.isPopular,
    availableDays: data.availableDays,
    availableFrom: data.availableFrom,
    availableTo: data.availableTo,
    sortOrder: data.sortOrder,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    images: data.images.map((i) => ({ mediaId: i.mediaId, isPrimary: i.isPrimary })),
    tags: data.tags,
    variants: data.variants.map((v) => ({
      id: v.id,
      name: v.name,
      option:
        v.optionGroup && v.optionValue
          ? { group: v.optionGroup, value: v.optionValue }
          : null,
      sku: v.sku,
      barcode: v.barcode,
      price: v.priceCents / 100,
      compareAtPrice: centsToMajor(v.compareAtPriceCents),
      cost: centsToMajor(v.costCents),
      isDefault: v.isDefault,
      isActive: v.isActive,
    })),
    addonGroups: data.addonGroups.map((g) => ({
      id: g.id,
      name: g.name,
      isRequired: g.isRequired,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections ?? null,
      addons: g.addons.map((a) => ({
        id: a.id,
        name: a.name,
        price: a.priceCents / 100,
        maxQuantity: a.maxQuantity,
        isActive: a.isActive,
      })),
    })),
    initialStock: null,
  };
}

const CREATE_DEFAULTS: ProductUpsertInput = {
  name: "",
  slug: "",
  categoryId: "",
  shortDescription: null,
  description: null,
  sku: null,
  barcode: null,
  basePrice: 0,
  compareAtPrice: null,
  cost: null,
  foodType: "NON_VEGETARIAN",
  spicyLevel: "NONE",
  prepTimeMinutes: null,
  calories: null,
  servingInfo: null,
  isActive: true,
  isAvailable: true,
  trackInventory: false,
  isFeatured: false,
  isTrending: false,
  isPopular: false,
  availableDays: [0, 1, 2, 3, 4, 5, 6],
  availableFrom: "",
  availableTo: "",
  sortOrder: 0,
  seoTitle: null,
  seoDescription: null,
  images: [],
  tags: [],
  variants: [],
  addonGroups: [],
  initialStock: null,
};

/**
 * ProductForm — the complete catalog editor (create & edit). Tabs keep the
 * surface calm; everything saves through one validated upsert payload.
 */
export function ProductForm({
  meta,
  product,
  canUpdate,
}: {
  meta: ProductFormMeta;
  /** undefined → create mode */
  product?: ProductEditorData;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // slug stays auto-derived from the name until the user edits it manually
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [gallery, setGallery] = useState<GalleryItem[]>(
    product?.images.map((i) => ({
      mediaId: i.mediaId,
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })) ?? [],
  );

  const form = useForm<ProductUpsertInput>({
    resolver: zodResolver(productUpsertSchema),
    defaultValues: product ? toFormValues(product) : CREATE_DEFAULTS,
  });

  const watchedName = useWatch({ control: form.control, name: "name" });
  const trackInventory = useWatch({ control: form.control, name: "trackInventory" });

  // Indent child categories under their parents in the select.
  const categoryOptions = useMemo(() => {
    const roots = meta.categories.filter((c) => !c.parentId);
    const children = meta.categories.filter((c) => c.parentId);
    return roots.flatMap((root) => [
      { ...root, depth: 0 },
      ...children.filter((c) => c.parentId === root.id).map((c) => ({ ...c, depth: 1 })),
    ]);
  }, [meta.categories]);

  function handleNameChange(value: string) {
    if (!slugTouched) {
      form.setValue("slug", slugify(value), { shouldDirty: true });
    }
  }

  async function onSubmit(values: ProductUpsertInput) {
    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, values);
        toast.success("Product saved.");
        router.refresh();
      } else {
        const { id } = await createProduct(values);
        toast.success("Product created.");
        router.push(`/admin/products/${id}`);
        router.refresh();
      }
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        const entries = Object.entries(error.details);
        entries.forEach(([path, messages]) =>
          form.setError(path as never, { message: messages[0] }),
        );
        const first = entries[0];
        toast.error(`${first?.[0]}: ${first?.[1]?.[0]}`);
      } else {
        toast.error(
          error instanceof Error ? error.message : "Couldn't save. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & stock</TabsTrigger>
            <TabsTrigger value="variants">Variants & add-ons</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* ── Details ─────────────────────────────────────────────── */}
          <TabsContent value="details" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Basics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dish name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Chicken Tikka Pizza"
                          {...field}
                          onChange={(event) => {
                            field.onChange(event);
                            handleNameChange(event.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="chicken-tikka-pizza"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => {
                            setSlugTouched(true);
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="font-mono text-[11px]">
                        /menu/{watchedName ? slugify(watchedName) || "…" : "…"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pick a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.depth ? "— " : ""}
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card blurb</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Smoky, spicy, crowd favorite"
                          maxLength={255}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>Shown on menu cards.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Full description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Ingredients, preparation, what makes it special…"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dietary & kitchen</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="foodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FOOD_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spicyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spiciness</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SPICY_LEVEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prepTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prep time (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={600}
                          placeholder="20"
                          {...field}
                          value={field.value ?? ""}
                          onChange={numberChange(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories (kcal)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="540"
                          {...field}
                          value={field.value ?? ""}
                          onChange={numberChange(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingInfo"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Serving info</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Serves 2–3 · 12 inch"
                          maxLength={80}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagsField
                          value={field.value}
                          onChange={field.onChange}
                          suggestions={meta.tags}
                        />
                      </FormControl>
                      <FormDescription>
                        Facets like “Bestseller” or “Chef’s Pick” — they power storefront
                        rails and filters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pricing & stock ─────────────────────────────────────── */}
          <TabsContent value="pricing" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & identity</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          {...field}
                          value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
                          onChange={numberChange(field.onChange, { nullable: false })}
                        />
                      </FormControl>
                      <FormDescription>“From” price when variants exist.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="compareAtPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compare-at price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="—"
                          {...field}
                          value={field.value ?? ""}
                          onChange={numberChange(field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>Strikethrough “was” price.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost (COGS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="—"
                          {...field}
                          value={field.value ?? ""}
                          onChange={numberChange(field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>For margin analytics.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menu position</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
                          onChange={numberChange(field.onChange, { nullable: false })}
                        />
                      </FormControl>
                      <FormDescription>Lower shows earlier.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="PIZ-TIK-001"
                          maxLength={64}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="EAN / UPC"
                          maxLength={64}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="trackInventory"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-xl border p-3.5">
                      <div>
                        <FormLabel className="text-sm">Track stock</FormLabel>
                        <FormDescription>
                          Count units per branch; orders decrement and low-stock alerts
                          fire automatically.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!product && trackInventory ? (
                  <div className="grid gap-4 rounded-xl border border-dashed p-3.5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="initialStock.quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening stock (main branch)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
                              onChange={numberChange(field.onChange, { nullable: false })}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="initialStock.lowStockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low-stock alert below</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="10"
                              {...field}
                              value={field.value ?? ""}
                              onChange={numberChange(field.onChange)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Merchandising</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["isFeatured", "Featured", "Editorial hero spots on the homepage."],
                    ["isTrending", "Trending", "Shown in the “Trending now” rail."],
                    ["isPopular", "Popular", "Boosted in the “Popular” rail."],
                  ] as const
                ).map(([name, label, description]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3 rounded-xl border p-3.5">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-sm">{label}</FormLabel>
                          <FormDescription className="text-xs">
                            {description}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Variants & add-ons ──────────────────────────────────── */}
          <TabsContent value="variants" className="space-y-5">
            <Card>
              <CardContent className="pt-6">
                <VariantsField />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <AddonGroupsField />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Media ───────────────────────────────────────────────── */}
          <TabsContent value="media">
            <Card>
              <CardContent className="pt-6">
                <ProductMediaField gallery={gallery} onChange={setGallery} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Availability ────────────────────────────────────────── */}
          <TabsContent value="availability" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-xl border p-3.5">
                      <div>
                        <FormLabel className="text-sm">On the menu</FormLabel>
                        <FormDescription>
                          Inactive dishes disappear entirely.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-xl border p-3.5">
                      <div>
                        <FormLabel className="text-sm">Available now</FormLabel>
                        <FormDescription>
                          Quick pause without hiding the dish.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="availableDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Served on</FormLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_OPTIONS.map((day) => {
                          const checked = field.value.includes(day.value);
                          return (
                            <label
                              key={day.value}
                              className="cursor-pointer"
                              title={day.label}
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? field.value.filter((d) => d !== day.value)
                                    : [...field.value, day.value].sort();
                                  field.onChange(next);
                                }}
                              />
                              <span className="border-muted-foreground/25 peer-checked:bg-primary peer-checked:border-primary peer-checked:text-primary-foreground inline-flex size-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors">
                                {day.short}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="availableFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available from</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="availableTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available until</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Leave both empty to serve all day.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SEO ─────────────────────────────────────────────────── */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>Search & sharing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="seoTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SEO title</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={255}
                          placeholder="Chicken Tikka Pizza — Order Online"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/255 — empty falls back to the dish
                        name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seoDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          maxLength={320}
                          placeholder="Wood-fired tikka pizza with smoked chicken…"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/320 — used by Google & social cards.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="bg-background/80 sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-2xl border p-3 backdrop-blur-md">
          <p className="text-muted-foreground hidden text-xs sm:block">
            {canUpdate
              ? "Changes apply to the storefront immediately after saving."
              : "You have read-only access to the catalog."}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canUpdate}>
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {product ? "Save changes" : "Create product"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

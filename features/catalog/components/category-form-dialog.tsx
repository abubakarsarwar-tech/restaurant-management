"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageField } from "@/components/shared/media-picker";
import { ApiError } from "@/services/api-client";
import { createCategory, updateCategory } from "@/services/catalog-admin.service";
import { slugify } from "@/utils/slugify";
import { CATEGORY_COLOR_THEMES, CATEGORY_ICON_OPTIONS } from "../constants";
import { categoryUpsertSchema, type CategoryUpsertInput } from "../schemas";
import type { CategoryListRow } from "../types";
import type { MediaSelection } from "@/features/media/types";
import { numberChange } from "./number-change";
import { cn } from "@/lib/utils";

/**
 * CategoryFormDialog — create/edit one category: identity, hierarchy,
 * presentation (icon, color theme, square image + wide banner), flags.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  rows,
  canUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined → create mode */
  category?: CategoryListRow | null;
  rows: CategoryListRow[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [image, setImage] = useState<MediaSelection | null>(
    category?.imageUrl && category.imageMediaId
      ? { mediaId: category.imageMediaId, url: category.imageUrl, alt: category.name }
      : null,
  );
  const [banner, setBanner] = useState<MediaSelection | null>(
    category?.bannerUrl && category.bannerMediaId
      ? { mediaId: category.bannerMediaId, url: category.bannerUrl, alt: category.name }
      : null,
  );

  const form = useForm<CategoryUpsertInput>({
    resolver: zodResolver(categoryUpsertSchema),
    values: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      parentId: category?.parentId ?? null,
      description: category?.description ?? null,
      imageMediaId: category?.imageMediaId ?? null,
      bannerMediaId: category?.bannerMediaId ?? null,
      icon: category?.icon ?? "general",
      colorTheme: category?.colorTheme ?? "flame",
      isEditorsChoice: category?.isEditorsChoice ?? false,
      isActive: category?.isActive ?? true,
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  async function onSubmit(values: CategoryUpsertInput) {
    setSaving(true);
    try {
      const payload: CategoryUpsertInput = {
        ...values,
        imageMediaId: image?.mediaId ?? null,
        bannerMediaId: banner?.mediaId ?? null,
      };
      if (category) {
        await updateCategory(category.id, payload);
        toast.success("Category saved.");
      } else {
        await createCategory(payload);
        toast.success("Category created.");
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save category.");
    } finally {
      setSaving(false);
    }
  }

  const parentCandidates = rows.filter((row) => row.id !== category?.id && !row.parentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories organize the menu and drive the storefront category slider.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pizzas"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (!slugTouched) {
                            form.setValue("slug", slugify(event.target.value));
                          }
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
                        placeholder="pizzas"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => {
                          setSlugTouched(true);
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent category</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Top level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Top level</SelectItem>
                        {parentCandidates.map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Nest under a top-level category.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
                        onChange={numberChange(field.onChange, { nullable: false })}
                      />
                    </FormControl>
                    <FormDescription>Lower appears first in the slider.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="Wood-fired classics & seasonal specials…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* icon picker */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                    {CATEGORY_ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        title={label}
                        onClick={() => field.onChange(key)}
                        className={cn(
                          "hover:border-primary/50 hover:bg-primary/[0.06] flex aspect-square items-center justify-center rounded-lg border transition-colors",
                          field.value === key
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4.5" />
                        <span className="sr-only">{label}</span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* color theme picker */}
            <FormField
              control={form.control}
              name="colorTheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color theme</FormLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.key}
                        type="button"
                        title={theme.label}
                        onClick={() => field.onChange(theme.key)}
                        className={cn(
                          "size-8 rounded-full transition-all",
                          theme.swatch,
                          field.value === theme.key
                            ? "ring-ring ring-offset-background ring-2 ring-offset-2"
                            : "opacity-70 hover:opacity-100",
                        )}
                      >
                        <span className="sr-only">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField
                label="Card image"
                folder="restaurant/categories"
                value={image}
                onChange={setImage}
                aspect="aspect-square"
                hint="Square-ish, used in the category slider."
              />
              <ImageField
                label="Banner"
                folder="restaurant/categories"
                value={banner}
                onChange={setBanner}
                aspect="aspect-video"
                hint="Wide hero for the category page."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="isEditorsChoice"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <FormLabel className="text-sm">Editor&#39;s choice</FormLabel>
                      <FormDescription className="text-xs">
                        Spotlighted on the homepage.
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <FormLabel className="text-sm">Visible</FormLabel>
                      <FormDescription className="text-xs">
                        Hidden categories leave the menu.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || (!!category && !canUpdate)}>
                {saving ? <Loader2Icon className="animate-spin" /> : null}
                {category ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

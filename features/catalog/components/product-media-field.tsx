"use client";

import { useState } from "react";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImagePlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/shared/media-picker";
import type { MediaSelection } from "@/features/media/types";
import type { ProductUpsertInput } from "../schemas";
import { cn } from "@/lib/utils";

type GalleryItem = MediaSelection & { isPrimary?: boolean };

/**
 * ProductMediaField — ordered gallery with one hero (primary) image.
 * Ordering is arrow-based (accessible & touch-friendly); primary is a star
 * toggle. Persistence stores mediaId + isPrimary only.
 */
export function ProductMediaField({
  gallery,
  onChange,
}: {
  gallery: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
}) {
  const form = useFormContext<ProductUpsertInput>();
  const [pickerOpen, setPickerOpen] = useState(false);

  function syncImages(items: GalleryItem[]) {
    onChange(items);
    form.setValue(
      "images",
      items.map((item) => ({
        mediaId: item.mediaId,
        isPrimary: item.isPrimary ?? false,
      })),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function move(index: number, delta: number) {
    const next = [...gallery];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    syncImages(next);
  }

  function setPrimary(index: number) {
    syncImages(gallery.map((item, i) => ({ ...item, isPrimary: i === index })));
  }

  function remove(index: number) {
    const next = gallery.filter((_, i) => i !== index);
    if (next.length && !next.some((i) => i.isPrimary)) {
      next[0] = { ...next[0]!, isPrimary: true };
    }
    syncImages(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Photo gallery</h3>
          <p className="text-muted-foreground text-xs">
            First (starred) photo is the hero shown on cards. Up to 12 images.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={gallery.length >= 12}
          onClick={() => setPickerOpen(true)}
        >
          <ImagePlusIcon /> Add image
        </Button>
      </div>

      {gallery.length === 0 ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/[0.03] text-muted-foreground flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors"
        >
          <ImagePlusIcon className="size-6" />
          <span className="text-xs font-medium">Add the first photo of this dish</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((item, index) => (
            <div
              key={item.mediaId}
              className="group bg-muted/40 relative aspect-square overflow-hidden rounded-xl border"
            >
              <Image
                src={item.url}
                alt={item.alt ?? `Product image ${index + 1}`}
                fill
                sizes="220px"
                className="object-cover"
              />

              {/* primary ribbon */}
              <button
                type="button"
                onClick={() => setPrimary(index)}
                className={cn(
                  "absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shadow-sm transition-colors",
                  item.isPrimary
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/45 text-white opacity-0 group-hover:opacity-100",
                )}
              >
                <StarIcon
                  className="size-3"
                  fill={item.isPrimary ? "currentColor" : "none"}
                />
                {item.isPrimary ? "Hero" : "Set hero"}
              </button>

              {/* controls */}
              <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move left"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  disabled={index === gallery.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move right"
                >
                  <ChevronRightIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  onClick={() => remove(index)}
                  aria-label="Remove image"
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        folder="restaurant/dishes"
        onSelect={(selection) => {
          if (gallery.some((g) => g.mediaId === selection.mediaId)) return;
          syncImages([...gallery, { ...selection, isPrimary: gallery.length === 0 }]);
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlusIcon,
  ImagesIcon,
  Loader2Icon,
  SearchIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAssets, uploadImage } from "@/services/media.service";
import { useDebounce } from "@/hooks/use-debounce";
import type { MediaSelection } from "@/features/media/types";
import { cn } from "@/lib/utils";

/**
 * MediaPicker — the platform-wide image chooser. Two tabs: upload (drag &
 * drop / file input → signed direct-to-Cloudinary) and library (registry
 * browser with search + paging). Reports a MediaSelection on confirm.
 */
export function MediaPicker({
  open,
  onOpenChange,
  folder,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cloudinary target folder + library filter, e.g. "restaurant/dishes" */
  folder: string;
  onSelect: (selection: MediaSelection) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQ = useDebounce(q, 350);

  const library = useQuery({
    queryKey: ["admin", "media", { folder, q: debouncedQ, page }],
    queryFn: () => listAssets({ folder, q: debouncedQ || undefined, page }),
    enabled: open && tab === "library",
  });

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const asset = await uploadImage(file, folder);
        toast.success("Image uploaded.");
        onSelect({ mediaId: asset.id, url: asset.secureUrl, alt: asset.alt });
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [folder, onOpenChange, onSelect],
  );

  const totalPages = Math.max(1, Math.ceil((library.data?.total ?? 0) / 24));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose an image</DialogTitle>
          <DialogDescription>
            Upload something new or reuse an asset from the library.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upload">
              <UploadCloudIcon /> Upload
            </TabsTrigger>
            <TabsTrigger value="library">
              <ImagesIcon /> Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                void handleFiles(event.dataTransfer.files);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/[0.03] focus-visible:ring-ring/50 flex h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors focus-visible:ring-[3px] disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2Icon className="text-primary size-8 animate-spin" />
                  <p className="text-sm font-medium">Uploading…</p>
                </>
              ) : (
                <>
                  <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
                    <ImagePlusIcon className="size-7" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium">
                      Drop an image here, or click to browse
                    </p>
                    <p className="text-muted-foreground text-xs">
                      JPEG · PNG · WebP · AVIF — up to 8 MB
                    </p>
                  </div>
                </>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </TabsContent>

          <TabsContent value="library" className="space-y-3 pt-2">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name…"
                className="pl-9"
              />
            </div>

            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {library.isPending ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))
              ) : library.data?.rows.length ? (
                library.data.rows.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelect({
                        mediaId: asset.id,
                        url: asset.secureUrl,
                        alt: asset.alt,
                      });
                      onOpenChange(false);
                    }}
                    className="group focus-visible:ring-ring/50 relative aspect-square overflow-hidden rounded-xl outline-none focus-visible:ring-[3px]"
                  >
                    <Image
                      src={asset.secureUrl}
                      alt={asset.alt ?? "Media asset"}
                      fill
                      sizes="160px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground col-span-full py-10 text-center text-sm">
                  Nothing here yet — upload your first image.
                </p>
              )}
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ImageField — single-image form control built on MediaPicker: thumbnail
 * preview with change/remove affordances. Used by category & settings forms.
 */
export function ImageField({
  label,
  folder,
  value,
  onChange,
  aspect = "aspect-video",
  hint,
}: {
  label: string;
  folder: string;
  value: MediaSelection | null;
  onChange: (value: MediaSelection | null) => void;
  aspect?: string;
  hint?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        className={cn(
          "bg-muted/40 group relative w-full max-w-xs overflow-hidden rounded-xl border",
          aspect,
        )}
      >
        {value ? (
          <>
            <Image
              src={value.url}
              alt={value.alt ?? label}
              fill
              sizes="320px"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                Change
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onChange(null)}
              >
                <Trash2Icon />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-muted-foreground hover:text-foreground flex size-full flex-col items-center justify-center gap-1.5 transition-colors"
          >
            <ImagePlusIcon className="size-6" />
            <span className="text-xs font-medium">Pick image</span>
          </button>
        )}
      </div>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        folder={folder}
        onSelect={onChange}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/**
 * SearchInput — debounced text search synced to the `?q=` URL param so list
 * pages stay server-rendered, shareable and back-button friendly.
 */
export function SearchInput({
  placeholder = "Search…",
  param = "q",
  className,
}: {
  placeholder?: string;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const current = searchParams.get(param) ?? "";
  const [value, setValue] = useState(current);
  const debounced = useDebounce(value, 350);

  // Keep local state in sync when the URL changes elsewhere (clear filters).
  useEffect(() => setValue(current), [current]);

  useEffect(() => {
    if (debounced === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) params.set(param, debounced);
    else params.delete(param);
    params.delete("page"); // new search ⇒ back to page 1
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }, [debounced, current, param, pathname, router, searchParams]);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-9"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
          aria-label="Clear search"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

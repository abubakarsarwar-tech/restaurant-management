"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import {
  FOOD_TYPE_OPTIONS,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STATUS_FILTERS,
} from "../constants";
import type { CategoryOption } from "../types";

/**
 * ProductsFilters — URL-synced toolbar: search + category/status/food/sort
 * selects. Server pages read the params, so filters are shareable URLs.
 */
export function ProductsFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "all") params.delete(key);
      else params.set(key, value);
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput placeholder="Search name or SKU…" className="w-full sm:w-64" />

      <Select
        value={searchParams.get("categoryId") ?? "all"}
        onValueChange={(v) => update("categoryId", v)}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by category">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.parentId ? "— " : ""}
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_STATUS_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("foodType") ?? "all"}
        onValueChange={(v) => update("foodType", v)}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by food type">
          <SelectValue placeholder="All food types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All food types</SelectItem>
          {FOOD_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sort") ?? "updated_desc"}
        onValueChange={(v) => update("sort", v)}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Sort">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

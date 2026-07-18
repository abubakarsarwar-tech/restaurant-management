import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn()` — the single source of truth for conditional class names.
 *
 * Combines `clsx` (conditional classes) with `tailwind-merge`
 * (dedupes conflicting Tailwind utilities so the last one wins).
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

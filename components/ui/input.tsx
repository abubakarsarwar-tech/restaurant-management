import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — design-system form field.
 * h-11 touch-friendly, warm muted placeholder, raised on focus with
 * primary ring, `aria-invalid` renders the error state automatically.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-background text-foreground placeholder:text-muted-foreground/70 hover:border-ring/40 focus:border-ring focus:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/25 flex h-11 w-full rounded-lg border px-3.5 py-2 text-sm shadow-xs transition-[box-shadow,border-color] duration-200 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

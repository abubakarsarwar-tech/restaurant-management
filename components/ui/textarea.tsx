import * as React from "react";

import { cn } from "@/lib/utils";

/** Textarea — matches Input styling, min height sized for ~3 rows. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground/70 hover:border-ring/40 focus:border-ring focus:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/25 flex min-h-24 w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-xs transition-[box-shadow,border-color] duration-200 ease-out outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

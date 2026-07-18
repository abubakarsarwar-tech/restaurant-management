import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Container — design-system width guardrails.
 *  - "app"   → max 1280px with responsive gutters (customer site)
 *  - "admin" → max 1440px (dashboard density)
 * Use the class utilities `container-app` / `container-admin` for
 * one-off cases; this component is the explicit, readable default.
 */
export function Container({
  variant = "app",
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "app" | "admin" }) {
  return (
    <div
      className={cn(variant === "admin" ? "container-admin" : "container-app", className)}
      {...props}
    />
  );
}

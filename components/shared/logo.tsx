import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Brand lockup — icon chip + wordmark in the display serif.
 * `withWordmark={false}` for tight spaces (mobile drawer header).
 */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "group focus-visible:ring-ring inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2",
        className,
      )}
      aria-label={`${siteConfig.name} — home`}
    >
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 ease-out group-hover:scale-105 group-hover:-rotate-6">
        <UtensilsCrossed className="size-5" strokeWidth={2.25} />
      </span>
      {withWordmark && (
        <span className="font-display text-foreground text-xl font-semibold tracking-tight">
          {siteConfig.name}
        </span>
      )}
    </Link>
  );
}

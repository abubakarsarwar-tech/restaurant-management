"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import * as React from "react";

import { ADMIN_NAV_SECTIONS } from "@/features/admin/constants";

/** Route-aware breadcrumbs built from the admin nav registry. */
export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    const known = ADMIN_NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.href === acc);
    crumbs.push({
      label:
        known?.title ??
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
      href: acc,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm md:flex">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground flex items-center transition-colors"
      >
        <Home className="size-4" />
        <span className="sr-only">Dashboard</span>
      </Link>
      {crumbs.slice(1).map((crumb, i, arr) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="text-muted-foreground/50 size-3.5" />
          {i === arr.length - 1 ? (
            <span className="text-foreground font-medium" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

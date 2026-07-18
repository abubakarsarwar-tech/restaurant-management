"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useUIStore } from "@/store/ui.store";
import { ADMIN_NAV_SECTIONS, type AdminNavItem } from "@/features/admin/constants";

/**
 * Collapsible admin sidebar.
 *  - Desktop: fixed rail, w-64 ↔ w-[76px] (labels collapse into tooltips)
 *  - Mobile: drawer (Sheet) driven by the topbar hamburger
 *  - Items are permission-gated by the session identity (server-passed
 *    permissions + platform-flag → everything visible for super admins)
 */
type SidebarIdentity = {
  isPlatformAdmin: boolean;
  permissions: string[];
};

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group focus-visible:ring-ring relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <span
        className={cn(
          "bg-primary absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
        )}
      />
      <item.icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 2} />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

function SidebarContent({
  identity,
  collapsed,
  onNavigate,
}: {
  identity: SidebarIdentity;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const allowed = (item: AdminNavItem) =>
    !item.permission ||
    identity.isPlatformAdmin ||
    identity.permissions.includes(item.permission);

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "border-sidebar-border flex h-16 items-center border-b px-5",
          collapsed && "justify-center px-0",
        )}
      >
        <Logo
          withWordmark={!collapsed}
          className="[&>span:last-child]:text-sidebar-foreground [&_svg]:!text-primary [&>span:first-child]:shadow-none"
        />
      </div>

      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
        aria-label="Admin navigation"
      >
        {ADMIN_NAV_SECTIONS.map((section) => {
          const items = section.items.filter(allowed);
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="space-y-1">
              {!collapsed && (
                <p className="text-muted-foreground/70 px-3 pb-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
                  {section.label}
                </p>
              )}
              {items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "border-sidebar-border border-t p-3",
          collapsed && "flex justify-center",
        )}
      >
        <p
          className={cn(
            "text-muted-foreground/60 px-2 text-[11px]",
            collapsed && "hidden",
          )}
        >
          {collapsed ? "" : "Saffron Table · Admin v0.1"}
        </p>
      </div>
    </div>
  );
}

export function AdminSidebar({ identity }: { identity: SidebarIdentity }) {
  const collapsed = useUIStore((s) => s.isAdminSidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleAdminSidebar);
  const mobileOpen = useUIStore((s) => s.isAdminMobileNavOpen);
  const setMobileOpen = useUIStore((s) => s.setAdminMobileNavOpen);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden border-r transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <SidebarContent identity={identity} collapsed={collapsed} />

        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="border-border bg-background text-muted-foreground hover:text-primary absolute top-[4.6rem] -right-3.5 flex size-7 items-center justify-center rounded-full border shadow-md transition-all duration-200 hover:shadow-lg"
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="bg-sidebar text-sidebar-foreground w-72 border-r-0 p-0"
        >
          <SidebarContent
            identity={identity}
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="text-muted-foreground hover:bg-sidebar-accent absolute top-4 right-4 rounded-full p-1.5"
          >
            <X className="size-5" />
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}

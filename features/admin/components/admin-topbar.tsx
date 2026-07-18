"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { useUIStore } from "@/store/ui.store";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";
import { CommandSearch } from "./command-search";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";

/** Sticky glass topbar: nav toggle, breadcrumbs, search, alerts, identity. */
export function AdminTopbar({
  name,
  email,
  roles,
}: {
  name: string;
  email: string;
  roles: string[];
}) {
  const setMobileOpen = useUIStore((s) => s.setAdminMobileNavOpen);

  return (
    <header className="border-border/60 bg-background/85 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <AdminBreadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <CommandSearch />
        <NotificationsMenu />
        <ModeToggle />
        <span className="bg-border mx-1 hidden h-6 w-px md:block" aria-hidden />
        <UserMenu name={name} email={email} roles={roles} />
      </div>
    </header>
  );
}

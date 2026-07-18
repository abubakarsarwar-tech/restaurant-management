"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

/** Identity passed from the server layout (already RBAC-resolved). */
export type AdminShellIdentity = {
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  isPlatformAdmin: boolean;
};

/**
 * Client shell — owns sidebar collapse spacing so the server layout stays
 * a pure guard + frame. Desktop content shifts with the rail width;
 * mobile uses the drawer (no offset).
 */
export function AdminShell({
  identity,
  children,
}: {
  identity: AdminShellIdentity;
  children: React.ReactNode;
}) {
  const collapsed = useUIStore((s) => s.isAdminSidebarCollapsed);

  return (
    <div className="bg-muted/30 min-h-screen">
      <AdminSidebar identity={identity} />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64",
        )}
      >
        <AdminTopbar
          name={identity.fullName}
          email={identity.email}
          roles={identity.roles}
        />
        <main className="container-admin flex-1 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

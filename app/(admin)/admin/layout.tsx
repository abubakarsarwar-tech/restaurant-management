import type { Metadata } from "next";

import { requireStaff } from "@/features/auth/server/session";
import { AdminShell } from "@/features/admin/components/admin-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell — server-side RBAC gate (any active staff identity;
 * permission-specific pages call requireStaff({ permission }) themselves),
 * then the client shell with the resolved identity.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff({ next: "/admin" });

  return (
    <AdminShell
      identity={{
        fullName: session.user.fullName,
        email: session.user.email,
        roles: session.roles,
        permissions: [...session.permissions],
        isPlatformAdmin: session.user.isPlatformAdmin,
      }}
    >
      {children}
    </AdminShell>
  );
}

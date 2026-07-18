import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission, requireStaff } from "@/features/auth/server/session";
import { CategoriesClient, listCategories } from "@/features/catalog";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await requireStaff({
    permission: "catalog:read",
    next: "/admin/categories",
  });

  if (!session.restaurantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No restaurant assigned</CardTitle>
          <CardDescription>
            Your account isn&apos;t linked to a restaurant yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = await listCategories(session.restaurantId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Structure the menu into sections — icons, colors and imagery shape the storefront slider."
      />
      <CategoriesClient
        rows={rows}
        canCreate={hasPermission(session, "catalog:create")}
        canUpdate={hasPermission(session, "catalog:update")}
        canDelete={hasPermission(session, "catalog:delete")}
      />
    </div>
  );
}

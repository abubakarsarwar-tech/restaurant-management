import { PageHeader } from "@/components/shared/page-header";
import { hasPermission, requireStaff } from "@/features/auth/server/session";
import { getProductFormMeta, ProductForm } from "@/features/catalog";

export const metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await requireStaff({
    permission: "catalog:create",
    next: "/admin/products/new",
  });
  const meta = await getProductFormMeta(session.restaurantId!);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="New product"
        description="Add a dish to the menu — everything saves in one go."
      />
      <ProductForm meta={meta} canUpdate={hasPermission(session, "catalog:create")} />
    </div>
  );
}

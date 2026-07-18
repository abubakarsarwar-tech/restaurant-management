import { NextResponse } from "next/server";

import { withApiErrors, HttpError } from "@/lib/api";
import { requireStaffApi } from "@/features/auth/server/session";
import { exportProductsCsv } from "@/features/catalog/server/products.service";

/**
 * GET /api/admin/products/export — full catalog as CSV (Excel-safe BOM,
 * streamed attachment). Intentionally NOT the JSON envelope: it's a download.
 */
export const dynamic = "force-dynamic";

export const GET = withApiErrors("products.export", async () => {
  const session = await requireStaffApi("catalog:read");
  if (!session.restaurantId) {
    throw new HttpError(409, "CONFLICT", "No restaurant assigned to your account.");
  }

  const csv = await exportProductsCsv(session.restaurantId);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

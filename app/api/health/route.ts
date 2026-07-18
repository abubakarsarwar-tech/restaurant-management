import { NextResponse } from "next/server";

import type { ApiResponse } from "@/types";

/**
 * Health probe — load balancers/uptime monitors hit this.
 * Deep checks (live MySQL ping via Prisma, Cloudinary reachability) are
 * added in the database part; today it proves the API layer + the shared
 * ApiResponse envelope end-to-end.
 */
export const dynamic = "force-dynamic";

type Health = {
  status: "ok";
  service: string;
  version: string;
  timestamp: string;
  environment: string;
};

export async function GET(): Promise<NextResponse<ApiResponse<Health>>> {
  const body: ApiResponse<Health> = {
    ok: true,
    data: {
      status: "ok",
      service: "restaurant-api",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
    },
  };

  return NextResponse.json(body, { status: 200 });
}

import { ReceiptText, ShoppingBag, UtensilsCrossed, Activity } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission, requireStaff } from "@/features/auth/server/session";
import {
  getDashboardStats,
  getOrderStatusDistribution,
  getRecentOrders,
  getRevenueSeries,
  getTopProducts,
} from "@/features/admin/server/dashboard.queries";
import { StatCard } from "@/features/admin/components/stat-card";
import { RevenueChart } from "@/features/admin/components/revenue-chart";
import { StatusDonut } from "@/features/admin/components/status-donut";
import { RecentOrders } from "@/features/admin/components/recent-orders";
import { formatPrice } from "@/utils/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireStaff({ next: "/admin" });
  const restaurantId = session.restaurantId ?? undefined;

  if (!restaurantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No restaurant assigned</CardTitle>
          <CardDescription>
            Your account isn&apos;t linked to a restaurant yet. Ask your owner to assign
            you a role, or check back later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const branchId = session.branchIds[0]; // branch-pinned roles scope down automatically
  const [stats, revenue, statuses, recent, topProducts] = await Promise.all([
    getDashboardStats(restaurantId, branchId),
    getRevenueSeries(restaurantId, 14, branchId),
    getOrderStatusDistribution(restaurantId, branchId),
    getRecentOrders(restaurantId, branchId),
    getTopProducts(restaurantId, 30),
  ]);

  const canViewAnalytics = hasPermission(session, "analytics:view");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 18
                ? "afternoon"
                : "evening"}
            , {session.user.fullName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm">
            Here&apos;s how the kitchen is doing today.
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={formatPrice(stats.todayRevenueCents)}
          icon={ReceiptText}
          tone="primary"
          sub={
            stats.avgOrderValueCents > 0
              ? `Avg ${formatPrice(stats.avgOrderValueCents)} per order`
              : "No paid orders yet"
          }
        />
        <StatCard
          label="Orders today"
          value={String(stats.todayOrders)}
          icon={ShoppingBag}
          tone="info"
          sub={`${stats.completionRate}% completion rate`}
        />
        <StatCard
          label="Live orders"
          value={String(stats.liveOrders)}
          icon={Activity}
          tone="warning"
          live={stats.liveOrders > 0}
          sub="In the pipeline right now"
        />
        <StatCard
          label="Menu & audience"
          value={`${stats.activeProducts} dishes`}
          icon={UtensilsCrossed}
          tone="success"
          sub={`${stats.totalCustomers} customers`}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Paid orders · last 14 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {canViewAnalytics ? (
              <RevenueChart data={revenue} />
            ) : (
              <p className="bg-muted/50 text-muted-foreground flex h-[280px] items-center justify-center rounded-xl text-sm">
                Revenue charts need the{" "}
                <code className="bg-muted mx-1 rounded px-1">analytics:view</code>{" "}
                permission.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order statuses</CardTitle>
            <CardDescription>Distribution across the pipeline</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <StatusDonut data={statuses} />
          </CardContent>
        </Card>
      </div>

      {/* Activity row */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <RecentOrders orders={recent} />

        <Card>
          <CardHeader>
            <CardTitle>Top sellers</CardTitle>
            <CardDescription>By quantity · last 30 days</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {topProducts.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Sales data will rank your heroes here.
              </p>
            ) : (
              topProducts.map((p, i) => (
                <div key={p.productName} className="flex items-center gap-3">
                  <span className="bg-primary/10 font-display text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.productName}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.totalQuantity} sold
                    </p>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatPrice(p.revenueCents)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

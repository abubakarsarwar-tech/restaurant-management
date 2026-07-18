import "server-only";

import { and, desc, eq, gte, notInArray, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { customers, orderItems, orders, products } from "@/db/schema";

/**
 * Dashboard read model — every widget's data, assembled with real queries.
 * A `branchId` filter narrows scope for branch-pinned roles (manager of BR-01).
 */

const FINAL_STATUSES = ["CANCELLED", "REJECTED"] as const;

function scope(restaurantId: string, branchId?: string): SQL[] {
  return branchId
    ? [eq(orders.restaurantId, restaurantId), eq(orders.branchId, branchId)]
    : [eq(orders.restaurantId, restaurantId)];
}

export type DashboardStats = {
  todayRevenueCents: number;
  todayOrders: number;
  avgOrderValueCents: number;
  activeProducts: number;
  totalCustomers: number;
  liveOrders: number;
  completionRate: number; // % of non-cancelled of last-100 orders
};

export async function getDashboardStats(
  restaurantId: string,
  branchId?: string,
): Promise<DashboardStats> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const where = scope(restaurantId, branchId);

  const [today] = await db
    .select({
      revenue:
        sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.paymentStatus} = 'PAID'), 0)`.mapWith(
          Number,
        ),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        ...where,
        gte(orders.createdAt, dayStart),
        notInArray(orders.status, [...FINAL_STATUSES]),
      ),
    );

  const [catalog] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .where(and(eq(products.restaurantId, restaurantId), eq(products.isActive, true)));

  const [audience] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(customers)
    .where(eq(customers.restaurantId, restaurantId));

  const [live] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(
      and(
        ...where,
        notInArray(orders.status, [...FINAL_STATUSES, "DELIVERED", "COMPLETED"]),
      ),
    );

  const recent100 = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(...where))
    .orderBy(desc(orders.createdAt))
    .limit(100);
  const completed = recent100.filter((r) =>
    ["DELIVERED", "COMPLETED"].includes(r.status),
  ).length;

  return {
    todayRevenueCents: today?.revenue ?? 0,
    todayOrders: today?.count ?? 0,
    avgOrderValueCents: today?.count ? Math.round(today.revenue / today.count) : 0,
    activeProducts: catalog?.count ?? 0,
    totalCustomers: audience?.count ?? 0,
    liveOrders: live?.count ?? 0,
    completionRate: recent100.length
      ? Math.round((completed / recent100.length) * 100)
      : 0,
  };
}

export type RevenuePoint = {
  date: string;
  label: string;
  revenueCents: number;
  orders: number;
};

export async function getRevenueSeries(
  restaurantId: string,
  days = 14,
  branchId?: string,
): Promise<RevenuePoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${orders.createdAt}::date, 'YYYY-MM-DD')`,
      revenue:
        sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.paymentStatus} = 'PAID'), 0)`.mapWith(
          Number,
        ),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        ...scope(restaurantId, branchId),
        gte(orders.createdAt, since),
        notInArray(orders.status, [...FINAL_STATUSES]),
      ),
    )
    .groupBy(sql`${orders.createdAt}::date`)
    .orderBy(sql`${orders.createdAt}::date`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series: RevenuePoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    series.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenueCents: row?.revenue ?? 0,
      orders: row?.count ?? 0,
    });
  }
  return series;
}

export type StatusSlice = { status: string; count: number };

export async function getOrderStatusDistribution(
  restaurantId: string,
  branchId?: string,
): Promise<StatusSlice[]> {
  return db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(and(...scope(restaurantId, branchId)))
    .groupBy(orders.status);
}

export type RecentOrderRow = {
  id: string;
  orderNumber: number;
  type: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: Date;
  customerName: string;
  customerPhone: string;
};

export async function getRecentOrders(
  restaurantId: string,
  branchId?: string,
  limit = 8,
): Promise<RecentOrderRow[]> {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      type: orders.type,
      status: orders.status,
      totalCents: orders.totalCents,
      currency: orders.currency,
      createdAt: orders.createdAt,
      customerName: customers.fullName,
      customerPhone: customers.phone,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(...scope(restaurantId, branchId)))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export type TopProductRow = {
  productName: string;
  totalQuantity: number;
  revenueCents: number;
};

export async function getTopProducts(
  restaurantId: string,
  days = 30,
  limit = 5,
): Promise<TopProductRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select({
      productName: orderItems.productName,
      totalQuantity: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
      revenueCents: sql<number>`sum(${orderItems.lineTotalCents})`.mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, since),
        notInArray(orders.status, [...FINAL_STATUSES]),
      ),
    )
    .groupBy(orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);
}

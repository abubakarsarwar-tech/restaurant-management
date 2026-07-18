"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { StatusSlice } from "@/features/admin/server/dashboard.queries";
import { ORDER_STATUS_META, type OrderStatusKey } from "@/features/admin/constants";

const SLICE_COLORS: Record<string, string> = {
  PENDING: "var(--chart-3)",
  CONFIRMED: "var(--chart-4)",
  PREPARING: "var(--chart-1)",
  READY: "var(--chart-2)",
  OUT_FOR_DELIVERY: "var(--chart-5)",
  DELIVERED: "var(--success)",
  COMPLETED: "var(--success)",
  CANCELLED: "var(--destructive)",
  REJECTED: "var(--destructive)",
};

/** Order status distribution — donut + compact legend. */
export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <p className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
        No orders yet — the board lights up after the first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="border-border/60 bg-popover rounded-lg border px-3 py-1.5 text-xs shadow-lg">
                    <span className="font-medium">{payload[0].name}</span> ·{" "}
                    {payload[0].value} orders
                  </div>
                ) : null
              }
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2.5}
              strokeWidth={0}
            >
              {data.map((slice) => (
                <Cell
                  key={slice.status}
                  fill={SLICE_COLORS[slice.status] ?? "var(--muted)"}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold">{total}</span>
          <span className="text-muted-foreground text-[11px]">orders</span>
        </span>
      </div>

      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {data.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SLICE_COLORS[slice.status] ?? "var(--muted)" }}
            />
            <span className="text-muted-foreground truncate">
              {ORDER_STATUS_META[slice.status as OrderStatusKey]?.label ?? slice.status}
            </span>
            <span className="ml-auto font-medium tabular-nums">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

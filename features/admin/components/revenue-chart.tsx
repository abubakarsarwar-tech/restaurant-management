"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPrice } from "@/utils/format";
import type { RevenuePoint } from "@/features/admin/server/dashboard.queries";

/**
 * 14-day revenue area chart — token-colored, dark-mode aware via CSS vars.
 * Recharts renders client-side; the page streams data in from the server.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => `$${Math.round(v / 100)}`}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="border-border/60 bg-popover rounded-xl border px-3.5 py-2.5 shadow-lg">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="text-foreground text-sm font-semibold">
                    {formatPrice(payload[0].payload.revenueCents)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {payload[0].payload.orders} orders
                  </p>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="revenueCents"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--background)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

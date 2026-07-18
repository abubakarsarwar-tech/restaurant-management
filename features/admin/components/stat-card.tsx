import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dashboard stat tile — icon chip, label, big number, optional trend +
 * live-flowing indicator (pulse) for "happening now" metrics.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  sub,
  live = false,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down"; good: boolean };
  sub?: string;
  live?: boolean;
  tone?: "primary" | "success" | "warning" | "info";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  return (
    <Card className="shadow-lift overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            {label}
            {live && (
              <span className="relative flex size-2">
                <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-success relative inline-flex size-2 rounded-full" />
              </span>
            )}
          </p>
          <p className="font-display truncate text-2xl font-semibold tracking-tight md:text-[1.7rem]">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.good ? "text-success" : "text-destructive",
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {trend.value}
            </p>
          )}
          {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
        </div>

        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </span>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import { ArrowRight, Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, timeAgo } from "@/utils/format";
import { ORDER_STATUS_META, type OrderStatusKey } from "@/features/admin/constants";
import type { RecentOrderRow } from "@/features/admin/server/dashboard.queries";

const TYPE_ICONS: Record<string, React.ElementType> = {
  DELIVERY: Bike,
  TAKEAWAY: ShoppingBag,
  DINE_IN: UtensilsCrossed,
};

/** Latest orders table — the "what needs attention right now" surface. */
export function RecentOrders({ orders }: { orders: RecentOrderRow[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Latest activity across your branches</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href="/admin/orders">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        {orders.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No orders yet — they&apos;ll stream in here the moment your first customer
            checks out.
          </p>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full text-sm">
              <tbody className="divide-border/60 divide-y">
                {orders.map((order) => {
                  const meta = ORDER_STATUS_META[order.status as OrderStatusKey];
                  const TypeIcon = TYPE_ICONS[order.type] ?? ShoppingBag;
                  return (
                    <tr key={order.id} className="group">
                      <td className="py-3 pr-3">
                        <span className="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex size-9 items-center justify-center rounded-lg transition-colors">
                          <TypeIcon className="size-4" />
                        </span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders?focus=${order.id}`}
                          className="hover:text-primary font-semibold hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {timeAgo(order.createdAt)}
                        </p>
                      </td>
                      <td className="max-w-0 py-3 pr-4">
                        <p className="truncate font-medium">{order.customerName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {order.customerPhone}
                        </p>
                      </td>
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        <Badge variant={meta?.variant ?? "secondary"}>
                          {meta?.label ?? order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold whitespace-nowrap">
                        {formatPrice(order.totalCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

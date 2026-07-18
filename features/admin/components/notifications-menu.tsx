"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, PackageOpen, Tag, TriangleAlert, Truck } from "lucide-react";

import { api } from "@/services/api-client";
import { timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationsPayload = {
  unreadCount: number;
  items: NotificationRow[];
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  ORDER_PLACED: PackageOpen,
  ORDER_STATUS: Truck,
  PROMOTION: Tag,
  STOCK_ALERT: TriangleAlert,
  SYSTEM: Bell,
};

/** Bell with live unread badge (30s poll) + mark-all-read. */
export function NotificationsMenu() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => api.get<NotificationsPayload>("/admin/notifications"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/admin/notifications/read"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });

  const unread = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          className="relative"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-80 overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              You&apos;re all caught up. ✨
            </p>
          ) : (
            data.items.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? Bell;
              return (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    "flex cursor-default items-start gap-3 rounded-lg px-2.5 py-2.5",
                    !item.isRead && "bg-primary/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      item.isRead
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.body}
                    </span>
                    <span className="text-muted-foreground/70 mt-0.5 block text-[11px]">
                      {timeAgo(item.createdAt)}
                    </span>
                  </span>
                  {!item.isRead && (
                    <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem asChild className="text-primary justify-center text-sm">
            <Link href="/admin/notifications">View all activity</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

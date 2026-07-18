"use client";

import Link from "next/link";
import { BadgeCheck, LogOut, Settings, UtensilsCrossed } from "lucide-react";

import { useLogout } from "@/features/auth/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";

/** Profile dropdown (topbar right) — identity, role chips, logout. */
export function UserMenu({
  name,
  email,
  roles,
}: {
  name: string;
  email: string;
  roles: string[];
}) {
  const logout = useLogout();
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted focus-visible:ring-ring flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 transition-colors outline-none focus-visible:ring-2 md:pr-3 md:pl-1">
        <Avatar className="border-primary/20 size-9 border-2">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-left md:block">
          <span className="block max-w-[10rem] truncate text-sm leading-tight font-medium">
            {name}
          </span>
          <span className="text-muted-foreground block text-xs">
            {roles[0] ?? "Staff"}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
          <Avatar className="size-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-muted-foreground truncate text-xs">{email}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {roles.map((role) => (
                <span
                  key={role}
                  className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin" className="gap-2">
            <BadgeCheck className="size-4" /> My work
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/settings" className="gap-2">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank" className="gap-2">
            <UtensilsCrossed className="size-4" /> View storefront
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="gap-2"
        >
          {logout.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import {
  BarChart3,
  ClipboardList,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/** Admin navigation registry — gated per item by RBAC permission. */
export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** permission required to SEE the item (undefined = any staff) */
  permission?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        permission: "analytics:view",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Orders",
        href: "/admin/orders",
        icon: ShoppingBag,
        permission: "orders:read",
      },
      {
        title: "Kitchen Board",
        href: "/admin/kitchen",
        icon: ClipboardList,
        permission: "orders:read",
      },
      {
        title: "Customers",
        href: "/admin/customers",
        icon: Users,
        permission: "customers:read",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        title: "Products",
        href: "/admin/products",
        icon: UtensilsCrossed,
        permission: "catalog:read",
      },
      {
        title: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
        permission: "catalog:read",
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        title: "Coupons",
        href: "/admin/coupons",
        icon: Tag,
        permission: "coupons:manage",
      },
      {
        title: "Banners",
        href: "/admin/banners",
        icon: ImageIcon,
        permission: "media:manage",
      },
      {
        title: "Reviews",
        href: "/admin/reviews",
        icon: Star,
        permission: "reviews:moderate",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "settings:update",
      },
    ],
  },
];

/** Order status → presentation meta (label + badge variant). */
export const ORDER_STATUS_META = {
  PENDING: { label: "Pending", variant: "warning" as const },
  CONFIRMED: { label: "Accepted", variant: "info" as const },
  PREPARING: { label: "Preparing", variant: "accent" as const },
  READY: { label: "Ready", variant: "secondary" as const },
  OUT_FOR_DELIVERY: { label: "On the way", variant: "warning" as const },
  DELIVERED: { label: "Delivered", variant: "success" as const },
  COMPLETED: { label: "Completed", variant: "success" as const },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const },
  REJECTED: { label: "Rejected", variant: "destructive" as const },
};

export type OrderStatusKey = keyof typeof ORDER_STATUS_META;

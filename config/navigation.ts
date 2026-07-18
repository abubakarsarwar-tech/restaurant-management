import {
  Home,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  ClipboardList,
  Settings,
  BarChart3,
  FolderTree,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigation registry — one source of truth for header/footer/admin menus.
 * Icons are Lucide components; labels stay semantic for future i18n keys.
 */
export type NavItem = {
  title: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

/** Customer website — main header navigation. */
export const mainNav: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Menu", href: "/menu", icon: UtensilsCrossed },
  { title: "Orders", href: "/orders", icon: ClipboardList },
];

/** Admin dashboard — sidebar navigation (Part: Admin Dashboard). */
export const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { title: "Products", href: "/admin/products", icon: UtensilsCrossed },
  { title: "Categories", href: "/admin/categories", icon: FolderTree },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

/** Footer link columns for the customer site. */
export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Explore",
    items: [
      { title: "Menu", href: "/menu" },
      { title: "Today's Specials", href: "/menu?tag=specials" },
      { title: "Track Order", href: "/orders" },
    ],
  },
  {
    title: "Company",
    items: [
      { title: "About Us", href: "/about" },
      { title: "Contact", href: "/contact" },
      { title: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    items: [
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Terms of Service", href: "/terms" },
    ],
  },
];

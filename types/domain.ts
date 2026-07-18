/**
 * Domain types — app-level shapes shared between client & server.
 * These mirror what the Prisma models WILL return (designed in the
 * database part); keeping them here lets feature code compile against real
 * contracts today without coupling to generated Prisma types yet.
 *
 * Convention: cents for money, ISO strings over the wire, Date on server.
 */

export type Role = "CUSTOMER" | "STAFF" | "ADMIN";

export type OrderStatus =
  "PENDING" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

export type OrderType = "DELIVERY" | "PICKUP" | "DINE_IN";

export type PaymentMethod = "CASH" | "CARD_ON_DELIVERY" | "ONLINE";

export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount?: number;
};

export type ProductSummary = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  isVegetarian: boolean;
  isSpicy: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
};

export interface CartLineInput {
  productId: string;
  quantity: number;
  options?: { group: string; choice: string }[];
}

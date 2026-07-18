"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Cart store — client state for the ordering flow.
 *
 * Persisted to localStorage (key `cart-storage`) so a customer's cart
 * survives refresh. Server sync (logged-in carts, promo validation)
 * is layered on in the Cart/Checkout part via TanStack Query mutations.
 *
 * Money is stored in CENTS (integers) — never floats — to avoid
 * 0.1 + 0.2 rounding bugs at checkout.
 */

export type CartItemOption = {
  /** e.g. "Size" → "Large", "Extra cheese" → "+1" */
  group: string;
  choice: string;
  priceDeltaCents: number;
};

export type CartItem = {
  /** stable line id: productId + hash(options) */
  lineId: string;
  productId: string;
  name: string;
  imageUrl?: string;
  unitPriceCents: number;
  quantity: number;
  options: CartItemOption[];
};

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;

  addItem: (item: CartItem) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.lineId === item.lineId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineId === item.lineId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        })),

      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.lineId !== lineId)
              : state.items.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [] }),
      setDrawerOpen: (open) => set({ isDrawerOpen: open }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      // drawer state is UI-only — don't persist it
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** Derived selectors — subscribe narrowly to avoid rerenders. */
export const selectCartCount = (state: CartState) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotalCents = (state: CartState) =>
  state.items.reduce(
    (total, item) =>
      total +
      item.quantity *
        (item.unitPriceCents + item.options.reduce((s, o) => s + o.priceDeltaCents, 0)),
    0,
  );

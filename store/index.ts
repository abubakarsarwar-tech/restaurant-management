/**
 * Store barrel — client state lives in Zustand, server state in TanStack
 * Query. Rule of thumb: if it comes from the database it belongs in Query;
 * if it's "what is the user doing right now" it belongs here.
 */
export { useCartStore, selectCartCount, selectCartSubtotalCents } from "./cart.store";
export type { CartItem, CartItemOption } from "./cart.store";
export { useUIStore } from "./ui.store";

/**
 * features/admin public API (dashboard module).
 * Deeper admin surfaces (products, orders, customers…) ship in their parts
 * and export from their own slices.
 */
export { ADMIN_NAV_SECTIONS, ORDER_STATUS_META } from "./constants";
export { AdminShell } from "./components/admin-shell";

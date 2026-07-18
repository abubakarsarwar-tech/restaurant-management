/**
 * features/auth public API — the ONLY surface other code may import.
 *
 *   Server:  getSession, requireStaff(…), requireStaffApi(…), requireCustomer(…)
 *   Client:  useSession, useCan, useLogout
 *   Shared:  schemas, constants (cookies, permissions catalog, role presets)
 */
export { loginSchema, customerRegisterSchema } from "./schemas";
export type { LoginInput, CustomerRegisterInput } from "./schemas";
export {
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_PERMISSION_PRESETS,
  AUTH_ROUTES,
} from "./constants";
export type { Permission, RoleKey } from "./constants";

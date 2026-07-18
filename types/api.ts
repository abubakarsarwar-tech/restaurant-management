/**
 * API contracts — every route handler returns one of these envelopes so
 * client code (TanStack Query hooks) handles success/error identically.
 */

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** zod field errors, keyed by field */
    details?: Record<string, string[]>;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/** Cursor-based pagination scales better than OFFSET on huge menus/orders. */
export type Paginated<T> = {
  items: T[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
    total?: number;
  };
};

/** Shared sort-order literal for list endpoints. */
export type SortOrder = "asc" | "desc";

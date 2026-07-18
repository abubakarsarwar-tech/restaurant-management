"use client";

import type { ApiResponse } from "@/types";

/**
 * Typed fetch wrapper for our own `/api/*` route handlers.
 * Every feature service (menu.service.ts, order.service.ts, …) composes
 * this single client, so error handling and credentials stay consistent.
 */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** JSON body — serialized automatically */
  body?: unknown;
  /** Query params — undefined values are dropped */
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = path.startsWith("http") ? path : `/api${path}`;
  if (!params) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: string,
  path: string,
  { body, params, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    method,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON body (proxy error, 502 HTML, …) handled below
  }

  if (!res.ok || !payload || !payload.ok) {
    if (payload && !payload.ok) {
      throw new ApiError(
        payload.error.code,
        payload.error.message,
        res.status,
        payload.error.details,
      );
    }
    throw new ApiError("INTERNAL_ERROR", `Request failed (${res.status})`, res.status);
  }

  return payload.data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};

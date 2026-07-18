import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ApiErrorCode, ApiResponse } from "@/types";

/**
 * Server-side response helpers — every Route Handler returns the shared
 * ApiResponse<T> envelope so the client api-client unwraps identically.
 */

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, string[]>,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

/** 422 with per-field details mapped from a ZodError. */
export function zodFail(error: ZodError): NextResponse<ApiResponse<never>> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_";
    (details[field] ??= []).push(issue.message);
  }
  const first = error.issues[0]?.message ?? "Validation failed";
  return fail("VALIDATION_ERROR", first, 422, details);
}

/** Catch-all guard: unexpected exceptions become consistent 500s (logged). */
export function internalFail(error: unknown, context: string) {
  console.error(`[api:${context}]`, error);
  return fail("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}

/**
 * Typed guard errors — thrown inside handlers/services, translated by
 * `withApiErrors` into proper ApiResponse failures.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Wrap a handler so thrown HttpError/unknown become envelope responses. */
export function withApiErrors<Args extends unknown[]>(
  context: string,
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return fail(error.code, error.message, error.status);
      }
      if (error instanceof ZodError) {
        return zodFail(error);
      }
      return internalFail(error, context);
    }
  };
}

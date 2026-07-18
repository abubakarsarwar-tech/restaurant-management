"use client";

import type { ChangeEvent } from "react";

/**
 * Wire <Input type="number"> to a numeric RHF field at the boundary:
 * empty string → null (nullable fields) or NaN (required fields, which zod
 * rejects with a friendly message) — never a string leaking into numbers.
 */
export function numberChange(
  onChange: (value: unknown) => void,
  options?: { nullable?: boolean },
) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === "") {
      onChange(options?.nullable === false ? Number.NaN : null);
      return;
    }
    const next = event.target.valueAsNumber;
    onChange(Number.isNaN(next) ? Number.NaN : next);
  };
}

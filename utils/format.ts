import { envClient } from "@/config/env.public";

/**
 * Formatting helpers — one place for money/date/phone display rules.
 * Client-safe (envClient only exposes NEXT_PUBLIC_* values).
 */

/** Format integer cents as localized currency: 1599 → "$15.99" */
export function formatPrice(cents: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(envClient.locale, {
    style: "currency",
    currency: envClient.currency,
    ...options,
  }).format(cents / 100);
}

/** "+1 (555) 123-4567"-style display passthrough for stored E.164-ish numbers */
export function formatPhone(phone: string): string {
  if (phone.length === 11 && phone.startsWith("1")) {
    return `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

/** "2 items" / "1 item" */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Compact order number for humans: #ORD-2026-0042 style ids stay intact */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
}

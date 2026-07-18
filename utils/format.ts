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

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 minutes ago" / "in 2 days" — Intl.RelativeTimeFormat over Date/ISO. */
export function timeAgo(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((then.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 60) return RTF.format(seconds, "seconds");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, "minutes");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, "hours");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return RTF.format(days, "days");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return RTF.format(months, "months");
  return RTF.format(Math.round(months / 12), "years");
}

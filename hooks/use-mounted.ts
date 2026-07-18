"use client";

import { useEffect, useState } from "react";

/**
 * True only after hydration — gate anything that reads browser-only state
 * (localStorage cart badge, matchMedia, theme) to avoid hydration mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted;
}

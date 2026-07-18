"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider — class-based dark mode (matches `@custom-variant dark`
 * in globals.css). `disableTransitionOnChange` prevents a flash of
 * animated colors when toggling.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

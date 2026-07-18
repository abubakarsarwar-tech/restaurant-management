"use client";

import * as React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Providers — the composition root for every client-side context.
 *
 * Order matters:
 *   Theme   (outermost: colors everything, incl. toasts & devtools)
 *   Query   (data layer available to all subtrees)
 *   Tooltip (Radix context for tooltips anywhere)
 *   Toaster (global toast portal, theme-aware)
 *
 * Going forward (auth session provider, cart hydration gate, websockets
 * for live order tracking) everything plugs in HERE — pages stay clean.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster />
        </TooltipProvider>
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryProvider>
    </ThemeProvider>
  );
}

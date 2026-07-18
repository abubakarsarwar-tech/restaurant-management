"use client";

import * as React from "react";
import {
  isServer,
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";

/**
 * TanStack Query — server-state cache for menu, orders, analytics.
 *
 * Defaults tuned for a food-ordering UX:
 * - 30s staleTime: menu data is warm but never annoyingly refetching
 * - 1 retry: fail fast so skeletons resolve into real error states
 * - no auto-refetch on window focus (feels "jumpy" while browsing a menu)
 */
const DEFAULT_OPTIONS: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
};

function makeQueryClient() {
  return new QueryClient({ defaultOptions: DEFAULT_OPTIONS });
}

let browserQueryClient: QueryClient | undefined;

/**
 * App-router safe client factory:
 * creating the client inside render could suspend-share it across users,
 * so the server makes one per request and the browser reuses a singleton.
 */
export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

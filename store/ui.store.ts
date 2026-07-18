"use client";

import { create } from "zustand";

/**
 * UI store — ephemeral interface state (mobile menu, admin sidebar).
 * Theme itself is owned by next-themes; this covers everything else.
 * Not persisted: fresh UI on every visit.
 */
interface UIState {
  isMobileMenuOpen: boolean;
  isAdminSidebarCollapsed: boolean;
  isAdminMobileNavOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleAdminSidebar: () => void;
  setAdminMobileNavOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isMobileMenuOpen: false,
  isAdminSidebarCollapsed: false,
  isAdminMobileNavOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  toggleAdminSidebar: () =>
    set((state) => ({ isAdminSidebarCollapsed: !state.isAdminSidebarCollapsed })),
  setAdminMobileNavOpen: (open) => set({ isAdminMobileNavOpen: open }),
}));

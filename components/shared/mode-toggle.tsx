"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Light/dark toggle — crossfade icon swap.
 * Renders a neutral placeholder until mounted to avoid hydration mismatch
 * between the server's unknown theme and the client's stored theme.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="relative block size-5">
        <Sun
          className={`absolute inset-0 size-5 transition-all duration-300 ${
            isDark ? "scale-100 rotate-0" : "scale-0 -rotate-90"
          }`}
        />
        <Moon
          className={`absolute inset-0 size-5 transition-all duration-300 ${
            isDark ? "scale-0 rotate-90" : "scale-100 rotate-0"
          }`}
        />
      </span>
    </Button>
  );
}

import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (no third-party font CDN at runtime →
 * faster, private, GDPR-friendly, works fully offline).
 *
 * Files live in `app/fonts/` (sourced from @fontsource-variable packages —
 * run `pnpm deps:fonts` to refresh them after an upgrade).
 *
 * - Inter (variable, 100–900)   → UI body text — crisp, neutral, readable
 * - Playfair Display (variable) → display headings — warm, editorial, premium
 */
export const fontSans = localFont({
  src: "../app/fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const fontDisplay = localFont({
  src: "../app/fonts/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

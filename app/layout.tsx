import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
import { fontSans, fontDisplay } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";
import { SiteHeader, SiteFooter } from "@/components/layout";

import "./globals.css";

/**
 * Root layout — the single shell every page renders inside.
 *
 *   <Providers>  → theme, TanStack Query, tooltips, global toast
 *   <SiteHeader> → sticky glass nav (customer site placeholder)
 *   <main>       → routed content (flex-1 keeps footer pinned)
 *   <SiteFooter> → config-driven footer
 *
 * The admin dashboard will introduce its own route-group layout
 * (app/(admin)/admin/layout.tsx) with a sidebar INSTEAD of this header —
 * route groups let each surface have its own chrome without ejecting
 * from the shared providers below.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(36 33% 98%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(24 12% 7%)" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "flex min-h-screen flex-col",
          fontSans.variable,
          fontDisplay.variable,
        )}
      >
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

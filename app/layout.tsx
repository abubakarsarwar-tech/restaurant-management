import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
import { fontSans, fontDisplay } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";

import "./globals.css";

/**
 * Root layout — document shell + provider composition ONLY.
 * Chrome (header/footer, dashboard shell, auth backdrop) is owned by the
 * route-group layouts: (site) | (auth) | (admin).
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
